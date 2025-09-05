/**
 * @fileoverview Express router for AI-powered content generation, management, scheduling, analytics, and statistics.
 * 
 * This module provides endpoints for:
 * - Generating new content using AI with user limits and engagement metrics.
 * - Retrieving, updating, editing, deleting, and scheduling user content.
 * - Simulating content posting.
 * - Fetching content statistics and advanced analytics.
 * - Recalculating engagement metrics for existing content.
 * 
 * Middleware:
 * - requireAuth: Ensures user authentication.
 * - contentValidation, scheduleValidation: Validates request bodies.
 * - handleValidationErrors: Handles validation errors.
 * 
 * Services:
 * - generateContent: Generates content using AI.
 * - checkUserLimits, trackContentGeneration, trackApiCall: Manages user usage and limits.
 * - calculateEngagementMetrics, getAdvancedAnalytics, getContentPerformanceScores: Provides analytics and metrics.
 * - ContentCache: Handles cache invalidation for user content.
 * 
 * Routes:
 * - POST   /generate                Generate new content.
 * - GET    /                        Get user's content (with optional status, limit, offset).
 * - GET    /:id                     Get a specific content item.
 * - PATCH  /:id/schedule            Schedule content for posting.
 * - PATCH  /:id/edit                Edit content text.
 * - DELETE /:id                     Delete content.
 * - PUT    /:id                     Update content fields.
 * - PATCH  /:id/post                Simulate posting content.
 * - GET    /stats/overview          Get content statistics overview.
 * - GET    /analytics/advanced      Get advanced analytics for a date range or timeframe.
 * - GET    /analytics/performance   Get content performance scores.
 * - POST   /analytics/recalculate   Recalculate engagement metrics for all user content.
 * 
 * @module routes/content
 */
import express from "express";
import { db } from "../config/database.js";
import { content } from "../models/schema.js";
import { eq, desc, and, gte } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import {
  contentValidation,
  scheduleValidation,
  handleValidationErrors,
} from "../middleware/validation.js";
import { generateContent } from "../services/ai-generator.js";
import {
  checkUserLimits,
  trackContentGeneration,
  trackApiCall,
} from "../services/usage.js";
import {
  calculateEngagementMetrics,
  getAdvancedAnalytics,
  getContentPerformanceScores,
} from "../services/analytics.js";
import { ContentCache } from "../services/cache.js";

const router = express.Router();

// Generate new content
router.post(
  "/generate",
  requireAuth,
  contentValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { topic, keyword, contentType, platformTarget } = req.body;

      // Check user limits
      const limits = await checkUserLimits(userId);
      if (!limits.canGenerate) {
        return res.status(429).json({
          message: "Daily content generation limit exceeded",
          limits,
        });
      }

      // Generate content using AI
      const generationResult = await generateContent(
        topic,
        keyword,
        contentType,
        platformTarget
      );

      // Calculate enhanced engagement metrics
      const engagementMetrics = calculateEngagementMetrics({
        contentType,
        platformTarget,
        wordCount: generationResult.wordCount,
        characterCount: generationResult.characterCount,
        generatedText: generationResult.generatedText,
      });

      // Save content to database with enhanced metrics
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
          potentialReachMetric: engagementMetrics.potentialReach,
          status: "draft",
        })
        .returning();

      // Add enhanced metrics to response
      const contentWithMetrics = {
        ...newContent[0],
        enhancedMetrics: engagementMetrics,
      };

      // Track usage
      await trackContentGeneration(userId);

      // Invalidate user cache since new content was created
      await ContentCache.invalidateUserCache(userId);

      res.status(201).json({
        message: "Content generated successfully",
        content: contentWithMetrics,
        remainingGenerations: limits.remainingGenerations - 1,
      });
    } catch (error) {
      console.error("Content generation error:", error);

      if (
        error.message.includes("OpenAI") ||
        error.message.includes("quota") ||
        error.message.includes("rate limit")
      ) {
        return res.status(503).json({ message: error.message });
      }

      res.status(500).json({ message: "Failed to generate content" });
    }
  }
);

// Get user's content
router.get("/", requireAuth, async (req, res) => {
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
    if (status && ["draft", "scheduled", "posted_simulated"].includes(status)) {
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
    console.error("Error fetching content:", error);
    res.status(500).json({ message: "Failed to fetch content" });
  }
});

// Get specific content item
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = parseInt(req.params.id);

    if (isNaN(contentId)) {
      return res.status(400).json({ message: "Invalid content ID" });
    }

    const contentItem = await db
      .select()
      .from(content)
      .where(and(eq(content.id, contentId), eq(content.userId, userId)))
      .limit(1);

    if (contentItem.length === 0) {
      return res.status(404).json({ message: "Content not found" });
    }

    res.json({ content: contentItem[0] });
  } catch (error) {
    console.error("Error fetching content item:", error);
    res.status(500).json({ message: "Failed to fetch content" });
  }
});

// Schedule content
router.patch(
  "/:id/schedule",
  requireAuth,
  scheduleValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const contentId = parseInt(req.params.id);
      const { scheduledAt } = req.body;

      if (isNaN(contentId)) {
        return res.status(400).json({ message: "Invalid content ID" });
      }

      // Verify content exists and belongs to user
      const existingContent = await db
        .select()
        .from(content)
        .where(and(eq(content.id, contentId), eq(content.userId, userId)))
        .limit(1);

      if (existingContent.length === 0) {
        return res.status(404).json({ message: "Content not found" });
      }

      // Update content with schedule
      const updatedContent = await db
        .update(content)
        .set({
          scheduledAt: new Date(scheduledAt),
          status: "scheduled",
          updatedAt: new Date(),
        })
        .where(eq(content.id, contentId))
        .returning();

      res.json({
        message: "Content scheduled successfully",
        content: updatedContent[0],
      });
    } catch (error) {
      console.error("Error scheduling content:", error);
      res.status(500).json({ message: "Failed to schedule content" });
    }
  }
);

// Update content text (edit)
router.patch("/:id/edit", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = parseInt(req.params.id);
    const { generatedText } = req.body;

    if (isNaN(contentId)) {
      return res.status(400).json({ message: "Invalid content ID" });
    }

    if (!generatedText || generatedText.trim().length === 0) {
      return res.status(400).json({ message: "Content text is required" });
    }

    // Verify content exists and belongs to user
    const existingContent = await db
      .select()
      .from(content)
      .where(and(eq(content.id, contentId), eq(content.userId, userId)))
      .limit(1);

    if (existingContent.length === 0) {
      return res.status(404).json({ message: "Content not found" });
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
      message: "Content updated successfully",
      content: updatedContent[0],
    });
  } catch (error) {
    console.error("Error updating content:", error);
    res.status(500).json({ message: "Failed to update content" });
  }
});

// Delete content
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = parseInt(req.params.id);

    if (isNaN(contentId)) {
      return res.status(400).json({ message: "Invalid content ID" });
    }

    // Verify content exists and belongs to user
    const existingContent = await db
      .select()
      .from(content)
      .where(and(eq(content.id, contentId), eq(content.userId, userId)))
      .limit(1);

    if (existingContent.length === 0) {
      return res.status(404).json({ message: "Content not found" });
    }

    // Delete content
    await db.delete(content).where(eq(content.id, contentId));

    // Invalidate user cache since content was deleted
    await ContentCache.invalidateUserCache(userId);

    res.json({ message: "Content deleted successfully" });
  } catch (error) {
    console.error("Error deleting content:", error);
    res.status(500).json({ message: "Failed to delete content" });
  }
});

// Update content
router.put("/:id", requireAuth, async (req, res) => {
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
      scheduledAt,
    } = req.body;

    if (isNaN(contentId)) {
      return res.status(400).json({ message: "Invalid content ID" });
    }

    // Verify content exists and belongs to user
    const existingContent = await db
      .select()
      .from(content)
      .where(and(eq(content.id, contentId), eq(content.userId, userId)))
      .limit(1);

    if (existingContent.length === 0) {
      return res.status(404).json({ message: "Content not found" });
    }

    // Calculate metrics for updated text
    const wordCount = generatedText
      ? generatedText.split(/\s+/).length
      : existingContent[0].wordCount;
    const characterCount = generatedText
      ? generatedText.length
      : existingContent[0].characterCount;

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
    if (platformTarget !== undefined)
      updateData.platformTarget = platformTarget;
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

    // Invalidate user cache since content was updated
    await ContentCache.invalidateUserCache(userId);

    res.json({
      message: "Content updated successfully",
      content: updatedContent[0],
    });
  } catch (error) {
    console.error("Error updating content:", error);
    res.status(500).json({ message: "Failed to update content" });
  }
});

// Simulate posting (mark as posted)
router.patch("/:id/post", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const contentId = parseInt(req.params.id);

    if (isNaN(contentId)) {
      return res.status(400).json({ message: "Invalid content ID" });
    }

    // Verify content exists and belongs to user
    const existingContent = await db
      .select()
      .from(content)
      .where(and(eq(content.id, contentId), eq(content.userId, userId)))
      .limit(1);

    if (existingContent.length === 0) {
      return res.status(404).json({ message: "Content not found" });
    }

    // Update content status to posted
    const updatedContent = await db
      .update(content)
      .set({
        status: "posted_simulated",
        updatedAt: new Date(),
      })
      .where(eq(content.id, contentId))
      .returning();

    res.json({
      message: "Content marked as posted successfully",
      content: updatedContent[0],
    });
  } catch (error) {
    console.error("Error posting content:", error);
    res.status(500).json({ message: "Failed to post content" });
  }
});

// Get content statistics
router.get("/stats/overview", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get counts by status
    const allContent = await db
      .select()
      .from(content)
      .where(eq(content.userId, userId));

    const stats = {
      total: allContent.length,
      draft: allContent.filter((c) => c.status === "draft").length,
      scheduled: allContent.filter((c) => c.status === "scheduled").length,
      posted: allContent.filter((c) => c.status === "posted_simulated").length,
      totalPotentialReach: allContent.reduce(
        (sum, c) => sum + (c.potentialReachMetric || 0),
        0
      ),
      contentTypes: {
        blog_post: allContent.filter((c) => c.contentType === "blog_post")
          .length,
        social_caption: allContent.filter(
          (c) => c.contentType === "social_caption"
        ).length,
      },
    };

    // Get scheduled content for next 7 days
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Get upcoming scheduled content by filtering in JavaScript to avoid complex SQL date operations
    const upcomingScheduled = allContent
      .filter((c) => {
        if (c.status !== "scheduled" || !c.scheduledAt) return false;
        const scheduledDate = new Date(c.scheduledAt);
        return scheduledDate >= now && scheduledDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    stats.upcomingScheduled = upcomingScheduled;

    res.json({ stats });
  } catch (error) {
    console.error("Error fetching content stats:", error);
    res.status(500).json({ message: "Failed to fetch content statistics" });
  }
});

// Get advanced analytics
router.get("/analytics/advanced", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, timeframe } = req.query;

    let start, end;
    if (timeframe) {
      // Handle timeframe parameter (days)
      const days = parseInt(timeframe) || 7;
      end = new Date();
      start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    } else {
      // Handle explicit date range
      end = endDate ? new Date(endDate) : new Date();
      start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const analytics = await getAdvancedAnalytics(userId, start, end);

    res.json({
      analytics,
      period: { startDate: start, endDate: end },
    });
  } catch (error) {
    console.error("Error fetching advanced analytics:", error);
    res.status(500).json({ message: "Failed to fetch advanced analytics" });
  }
});

// Get content performance scores
router.get("/analytics/performance", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const performanceData = await getContentPerformanceScores(userId);

    res.json({ performance: performanceData });
  } catch (error) {
    console.error("Error fetching content performance scores:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch content performance scores" });
  }
});

// Recalculate metrics for existing content
router.post("/analytics/recalculate", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all user content
    const userContent = await db
      .select()
      .from(content)
      .where(eq(content.userId, userId));

    // Recalculate metrics for each piece of content
    const updatePromises = userContent.map(async (item) => {
      const metrics = calculateEngagementMetrics(item);
      return db
        .update(content)
        .set({ potentialReachMetric: metrics.potentialReach })
        .where(eq(content.id, item.id));
    });

    await Promise.all(updatePromises);

    res.json({
      message: "Metrics recalculated successfully",
      updatedCount: userContent.length,
    });
  } catch (error) {
    console.error("Error recalculating metrics:", error);
    res.status(500).json({ message: "Failed to recalculate metrics" });
  }
});

export default router;
