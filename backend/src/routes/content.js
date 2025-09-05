import express from 'express';
import { db } from '../config/database.js';
import { content } from '../models/schema.js';
import { eq, desc, and, gte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { 
  contentValidation, 
  scheduleValidation, 
  handleValidationErrors 
} from '../middleware/validation.js';
import { generateContent } from '../services/ai-generator.js';
import { 
  checkUserLimits, 
  trackContentGeneration,
  trackApiCall 
} from '../services/usage.js';

const router = express.Router();

// Generate new content
router.post('/generate', requireAuth, contentValidation, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const { topic, keyword, contentType, platformTarget } = req.body;

    // Check user limits
    const limits = await checkUserLimits(userId);
    if (!limits.canGenerate) {
      return res.status(429).json({ 
        message: 'Daily content generation limit exceeded',
        limits 
      });
    }

    // Generate content using OpenAI
    const generationResult = await generateContent(topic, keyword, contentType, platformTarget);

    // Save content to database
    const newContent = await db
      .insert(content)
      .values({
        userId,
        topic,
        keyword: keyword || null,
        generatedText: generationResult.generatedText,
        contentType,
        platformTarget: platformTarget || null,
        wordCount: generationResult.wordCount,
        characterCount: generationResult.characterCount,
        potentialReachMetric: generationResult.potentialReach,
        status: 'draft',
      })
      .returning();

    // Track usage
    await trackContentGeneration(userId);

    res.status(201).json({
      message: 'Content generated successfully',
      content: newContent[0],
      remainingGenerations: limits.remainingGenerations - 1,
    });
  } catch (error) {
    console.error('Content generation error:', error);
    
    if (error.message.includes('OpenAI') || error.message.includes('quota') || error.message.includes('rate limit')) {
      return res.status(503).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to generate content' });
  }
});

// Get user's content
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 20, offset = 0 } = req.query;

    // Track API call
    await trackApiCall(userId);

    let query = db
      .select()
      .from(content)
      .where(eq(content.userId, userId))
      .orderBy(desc(content.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    // Filter by status if provided
    if (status && ['draft', 'scheduled', 'posted_simulated'].includes(status)) {
      query = db
        .select()
        .from(content)
        .where(and(eq(content.userId, userId), eq(content.status, status)))
        .orderBy(desc(content.createdAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset));
    }

    const userContent = await query;

    res.json({
      content: userContent,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: userContent.length === parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ message: 'Failed to fetch content' });
  }
});

// Get specific content item
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = parseInt(req.params.id);

    if (isNaN(contentId)) {
      return res.status(400).json({ message: 'Invalid content ID' });
    }

    const contentItem = await db
      .select()
      .from(content)
      .where(and(eq(content.id, contentId), eq(content.userId, userId)))
      .limit(1);

    if (contentItem.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    res.json({ content: contentItem[0] });
  } catch (error) {
    console.error('Error fetching content item:', error);
    res.status(500).json({ message: 'Failed to fetch content' });
  }
});

// Schedule content
router.patch('/:id/schedule', requireAuth, scheduleValidation, handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = parseInt(req.params.id);
    const { scheduledAt } = req.body;

    if (isNaN(contentId)) {
      return res.status(400).json({ message: 'Invalid content ID' });
    }

    // Verify content exists and belongs to user
    const existingContent = await db
      .select()
      .from(content)
      .where(and(eq(content.id, contentId), eq(content.userId, userId)))
      .limit(1);

    if (existingContent.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Update content with schedule
    const updatedContent = await db
      .update(content)
      .set({
        scheduledAt: new Date(scheduledAt),
        status: 'scheduled',
        updatedAt: new Date(),
      })
      .where(eq(content.id, contentId))
      .returning();

    res.json({
      message: 'Content scheduled successfully',
      content: updatedContent[0],
    });
  } catch (error) {
    console.error('Error scheduling content:', error);
    res.status(500).json({ message: 'Failed to schedule content' });
  }
});

// Update content text (edit)
router.patch('/:id/edit', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = parseInt(req.params.id);
    const { generatedText } = req.body;

    if (isNaN(contentId)) {
      return res.status(400).json({ message: 'Invalid content ID' });
    }

    if (!generatedText || generatedText.trim().length === 0) {
      return res.status(400).json({ message: 'Content text is required' });
    }

    // Verify content exists and belongs to user
    const existingContent = await db
      .select()
      .from(content)
      .where(and(eq(content.id, contentId), eq(content.userId, userId)))
      .limit(1);

    if (existingContent.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Calculate new metrics
    const wordCount = generatedText.trim().split(/\s+/).length;
    const characterCount = generatedText.length;

    // Update content
    const updatedContent = await db
      .update(content)
      .set({
        generatedText: generatedText.trim(),
        wordCount,
        characterCount,
        userEdited: true,
        updatedAt: new Date(),
      })
      .where(eq(content.id, contentId))
      .returning();

    res.json({
      message: 'Content updated successfully',
      content: updatedContent[0],
    });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ message: 'Failed to update content' });
  }
});

// Delete content
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = parseInt(req.params.id);

    if (isNaN(contentId)) {
      return res.status(400).json({ message: 'Invalid content ID' });
    }

    // Verify content exists and belongs to user
    const existingContent = await db
      .select()
      .from(content)
      .where(and(eq(content.id, contentId), eq(content.userId, userId)))
      .limit(1);

    if (existingContent.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Delete content
    await db
      .delete(content)
      .where(eq(content.id, contentId));

    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ message: 'Failed to delete content' });
  }
});

// Update content
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = parseInt(req.params.id);
    const { 
      topic, 
      keyword, 
      generatedText, 
      contentType, 
      platformTarget, 
      status,
      scheduledAt 
    } = req.body;

    if (isNaN(contentId)) {
      return res.status(400).json({ message: 'Invalid content ID' });
    }

    // Verify content exists and belongs to user
    const existingContent = await db
      .select()
      .from(content)
      .where(and(eq(content.id, contentId), eq(content.userId, userId)))
      .limit(1);

    if (existingContent.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Calculate metrics for updated text
    const wordCount = generatedText ? generatedText.split(/\s+/).length : existingContent[0].wordCount;
    const characterCount = generatedText ? generatedText.length : existingContent[0].characterCount;

    // Prepare update data
    const updateData = {
      updatedAt: new Date(),
    };

    if (topic !== undefined) updateData.topic = topic;
    if (keyword !== undefined) updateData.keyword = keyword;
    if (generatedText !== undefined) {
      updateData.generatedText = generatedText;
      updateData.wordCount = wordCount;
      updateData.characterCount = characterCount;
    }
    if (contentType !== undefined) updateData.contentType = contentType;
    if (platformTarget !== undefined) updateData.platformTarget = platformTarget;
    if (status !== undefined) updateData.status = status;
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }

    // Update content
    const updatedContent = await db
      .update(content)
      .set(updateData)
      .where(eq(content.id, contentId))
      .returning();

    res.json({ 
      message: 'Content updated successfully',
      content: updatedContent[0]
    });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ message: 'Failed to update content' });
  }
});

// Simulate posting (mark as posted)
router.patch('/:id/post', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = parseInt(req.params.id);

    if (isNaN(contentId)) {
      return res.status(400).json({ message: 'Invalid content ID' });
    }

    // Verify content exists and belongs to user
    const existingContent = await db
      .select()
      .from(content)
      .where(and(eq(content.id, contentId), eq(content.userId, userId)))
      .limit(1);

    if (existingContent.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Update content status to posted
    const updatedContent = await db
      .update(content)
      .set({
        status: 'posted_simulated',
        updatedAt: new Date(),
      })
      .where(eq(content.id, contentId))
      .returning();

    res.json({
      message: 'Content marked as posted successfully',
      content: updatedContent[0],
    });
  } catch (error) {
    console.error('Error posting content:', error);
    res.status(500).json({ message: 'Failed to post content' });
  }
});

// Get content statistics
router.get('/stats/overview', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get counts by status
    const allContent = await db
      .select()
      .from(content)
      .where(eq(content.userId, userId));

    const stats = {
      total: allContent.length,
      draft: allContent.filter(c => c.status === 'draft').length,
      scheduled: allContent.filter(c => c.status === 'scheduled').length,
      posted: allContent.filter(c => c.status === 'posted_simulated').length,
      totalPotentialReach: allContent.reduce((sum, c) => sum + (c.potentialReachMetric || 0), 0),
      contentTypes: {
        blog_post: allContent.filter(c => c.contentType === 'blog_post').length,
        social_caption: allContent.filter(c => c.contentType === 'social_caption').length,
      },
    };

    // Get scheduled content for next 7 days
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Get upcoming scheduled content by filtering in JavaScript to avoid complex SQL date operations
    const upcomingScheduled = allContent
      .filter(c => {
        if (c.status !== 'scheduled' || !c.scheduledAt) return false;
        const scheduledDate = new Date(c.scheduledAt);
        return scheduledDate >= now && scheduledDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    stats.upcomingScheduled = upcomingScheduled;

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching content stats:', error);
    res.status(500).json({ message: 'Failed to fetch content statistics' });
  }
});

export default router;
