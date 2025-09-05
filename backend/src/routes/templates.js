/**
 * @file templates.js
 * @module routes/templates
 * @description Express router for managing content templates in the AI Content Generator Scheduler backend.
 * 
 * This router provides endpoints for:
 * - Fetching all templates (user's and public)
 * - Fetching a template by ID
 * - Creating a new template
 * - Updating an existing template
 * - Deleting a template
 * - Generating content from a template using AI
 * - Fetching popular templates
 * - Searching templates by query and filters
 * 
 * All routes require authentication via the `requireAuth` middleware.
 * 
 * @requires express.Router
 * @requires ../config/database.js
 * @requires ../models/schema.js
 * @requires drizzle-orm
 * @requires ../middleware/auth.js
 * @requires ../services/cache.js
 * @requires ../services/ai-generator.js
 * 
 * @exports router
 */
import { Router } from "express";
import { db } from "../config/database.js";
import { contentTemplates, content } from "../models/schema.js";
import { eq, desc, and, or, like, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { ContentCache } from "../services/cache.js";
import { generateContent } from "../services/ai-generator.js";

const router = Router();

// Get all templates (user's + public)
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's templates and public templates
    const templates = await db
      .select()
      .from(contentTemplates)
      .where(
        or(
          eq(contentTemplates.userId, userId),
          eq(contentTemplates.isPublic, true)
        )
      )
      .orderBy(
        desc(contentTemplates.useCount),
        desc(contentTemplates.createdAt)
      );

    // Parse variables JSON
    const templatesWithParsedVariables = templates.map((template) => ({
      ...template,
      variables: JSON.parse(template.variables || "[]"),
    }));

    res.json({ templates: templatesWithParsedVariables });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});

// Get template by ID
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const template = await db
      .select()
      .from(contentTemplates)
      .where(
        and(
          eq(contentTemplates.id, parseInt(id)),
          or(
            eq(contentTemplates.userId, userId),
            eq(contentTemplates.isPublic, true)
          )
        )
      )
      .limit(1);

    if (!template.length) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Parse variables JSON
    const templateWithVariables = {
      ...template[0],
      variables: JSON.parse(template[0].variables || "[]"),
    };

    res.json({ template: templateWithVariables });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// Create new template
router.post("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      contentType,
      platformTarget,
      template,
      variables,
    } = req.body;

    // Validate required fields
    if (!name || !template || !contentType || !platformTarget) {
      return res.status(400).json({
        message:
          "Name, template, content type, and platform target are required",
      });
    }

    // Insert new template
    const result = await db
      .insert(contentTemplates)
      .values({
        userId,
        name,
        description: description || "",
        contentType,
        platformTarget,
        template,
        variables: JSON.stringify(variables || []),
        isPublic: false, // Default to private
        useCount: 0,
      })
      .returning();

    // Parse variables JSON for response
    const newTemplate = {
      ...result[0],
      variables: JSON.parse(result[0].variables || "[]"),
    };

    res.status(201).json({
      message: "Template created successfully",
      template: newTemplate,
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({ message: "Failed to create template" });
  }
});

// Update template
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      name,
      description,
      contentType,
      platformTarget,
      template,
      variables,
    } = req.body;

    // Check if template exists and belongs to user
    const existingTemplate = await db
      .select()
      .from(contentTemplates)
      .where(
        and(
          eq(contentTemplates.id, parseInt(id)),
          eq(contentTemplates.userId, userId)
        )
      )
      .limit(1);

    if (!existingTemplate.length) {
      return res
        .status(404)
        .json({ message: "Template not found or access denied" });
    }

    const existing = existingTemplate[0];

    // Update template
    const updatedTemplate = await db
      .update(contentTemplates)
      .set({
        name: name || existing.name,
        description:
          description !== undefined ? description : existing.description,
        contentType: contentType || existing.contentType,
        platformTarget: platformTarget || existing.platformTarget,
        template: template || existing.template,
        variables: JSON.stringify(
          variables || JSON.parse(existing.variables || "[]")
        ),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contentTemplates.id, parseInt(id)),
          eq(contentTemplates.userId, userId)
        )
      )
      .returning();

    // Parse variables JSON for response
    const templateWithVariables = {
      ...updatedTemplate[0],
      variables: JSON.parse(updatedTemplate[0].variables || "[]"),
    };

    res.json({
      message: "Template updated successfully",
      template: templateWithVariables,
    });
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({ message: "Failed to update template" });
  }
});

// Delete template
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if template exists and belongs to user
    const template = await db
      .select()
      .from(contentTemplates)
      .where(
        and(
          eq(contentTemplates.id, parseInt(id)),
          eq(contentTemplates.userId, userId)
        )
      )
      .limit(1);

    if (!template.length) {
      return res
        .status(404)
        .json({ message: "Template not found or access denied" });
    }

    // Delete template
    await db
      .delete(contentTemplates)
      .where(
        and(
          eq(contentTemplates.id, parseInt(id)),
          eq(contentTemplates.userId, userId)
        )
      );

    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ message: "Failed to delete template" });
  }
});

// Generate content from template
router.post("/generate", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId, variables, topic, keyword } = req.body;

    // Get template
    const template = await db
      .select()
      .from(contentTemplates)
      .where(
        and(
          eq(contentTemplates.id, parseInt(templateId)),
          or(
            eq(contentTemplates.userId, userId),
            eq(contentTemplates.isPublic, true)
          )
        )
      )
      .limit(1);

    if (!template.length) {
      return res.status(404).json({ message: "Template not found" });
    }

    const templateData = template[0];

    // Replace variables in template
    let processedTemplate = templateData.template;
    variables.forEach((variable) => {
      const regex = new RegExp(`{{${variable.name}}}`, "g");
      processedTemplate = processedTemplate.replace(regex, variable.value);
    });

    // Generate content using AI with the processed template as a base
    const prompt = `Based on this template: "${processedTemplate}", create engaging ${templateData.contentType} content for ${templateData.platformTarget}`;

    const generationResult = await generateContent(
      topic || `Content based on template: ${templateData.name}`,
      keyword || "",
      templateData.contentType,
      templateData.platformTarget
    );

    // Extract data from generation result
    const generatedText = generationResult.generatedText;
    const wordCount = generationResult.wordCount;
    const characterCount = generationResult.characterCount;
    const potentialReachMetric = generationResult.potentialReach;

    // Save generated content to database
    const result = await db
      .insert(content)
      .values({
        userId,
        topic: topic || `Content from template: ${templateData.name}`,
        keyword: keyword || "",
        generatedText: generatedText,
        contentType: templateData.contentType,
        platformTarget: templateData.platformTarget,
        status: "draft",
        potentialReachMetric,
        wordCount,
        characterCount: characterCount,
      })
      .returning();

    // Increment template use count
    await db
      .update(contentTemplates)
      .set({
        useCount: sql`${contentTemplates.useCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(contentTemplates.id, parseInt(templateId)));

    // Invalidate user cache
    await ContentCache.invalidateUserCache(userId);

    // Get remaining generations (simplified for now)
    const remainingGenerations = 100; // You can implement proper limit checking

    res.status(201).json({
      message: "Content generated from template successfully",
      content: result[0],
      remainingGenerations,
    });
  } catch (error) {
    console.error("Error generating content from template:", error);
    res
      .status(500)
      .json({ message: "Failed to generate content from template" });
  }
});

// Get popular templates
router.get("/popular", requireAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const templates = await db
      .select()
      .from(contentTemplates)
      .where(eq(contentTemplates.isPublic, true))
      .orderBy(
        desc(contentTemplates.useCount),
        desc(contentTemplates.createdAt)
      )
      .limit(parseInt(limit));

    // Parse variables JSON
    const templatesWithParsedVariables = templates.map((template) => ({
      ...template,
      variables: JSON.parse(template.variables || "[]"),
    }));

    res.json({ templates: templatesWithParsedVariables });
  } catch (error) {
    console.error("Error fetching popular templates:", error);
    res.status(500).json({ message: "Failed to fetch popular templates" });
  }
});

// Search templates
router.get("/search", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { q, contentType, platformTarget } = req.query;

    let whereConditions = [
      or(
        eq(contentTemplates.userId, userId),
        eq(contentTemplates.isPublic, true)
      ),
    ];

    if (q) {
      whereConditions.push(
        or(
          like(contentTemplates.name, `%${q}%`),
          like(contentTemplates.description, `%${q}%`),
          like(contentTemplates.template, `%${q}%`)
        )
      );
    }

    if (contentType) {
      whereConditions.push(eq(contentTemplates.contentType, contentType));
    }

    if (platformTarget) {
      whereConditions.push(eq(contentTemplates.platformTarget, platformTarget));
    }

    const templates = await db
      .select()
      .from(contentTemplates)
      .where(and(...whereConditions))
      .orderBy(
        desc(contentTemplates.useCount),
        desc(contentTemplates.createdAt)
      );

    // Parse variables JSON
    const templatesWithParsedVariables = templates.map((template) => ({
      ...template,
      variables: JSON.parse(template.variables || "[]"),
    }));

    res.json({ templates: templatesWithParsedVariables });
  } catch (error) {
    console.error("Error searching templates:", error);
    res.status(500).json({ message: "Failed to search templates" });
  }
});

export default router;
