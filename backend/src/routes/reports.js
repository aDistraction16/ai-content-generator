/**
 * @file reports.js
 * @module routes/reports
 * @description
 * Express router for handling user content reports, analytics, and summaries.
 * 
 * Provides endpoints for:
 * - Generating and downloading PDF reports (standard and enhanced) for user content.
 * - Fetching user's report history and dashboard analytics.
 * - Sending weekly summary emails.
 * - Deleting reports and associated files.
 * 
 * Middleware:
 * - All routes require authentication via `requireAuth`.
 * 
 * Endpoints:
 * @route POST /generate-pdf
 *   Generates a PDF report for the user's content within a specified date range.
 * 
 * @route POST /generate-enhanced-pdf
 *   Generates an enhanced PDF report with advanced analytics for the user's content.
 * 
 * @route GET /download/:reportId
 *   Downloads a previously generated PDF report by report ID.
 * 
 * @route GET /
 *   Retrieves the authenticated user's report history.
 * 
 * @route GET /dashboard
 *   Returns dashboard analytics and trends for the user's content.
 * 
 * @route POST /send-weekly-summary
 *   Sends a weekly summary email to the user with content statistics and upcoming scheduled content.
 * 
 * @route DELETE /:reportId
 *   Deletes a report and its associated PDF file.
 * 
 * Helper Functions:
 * - calculateTrends: Calculates weekly trends in content and reach.
 * - getWeekKey: Returns a string key representing the start of the week for a given date.
 * - calculatePercentageChange: Calculates the percentage change between two values.
 * - getMostProductiveDay: Determines the day of the week with the most content generated.
 * 
 * Dependencies:
 * - Express, Drizzle ORM, PDF and email services, authentication middleware, Node.js fs and path modules.
 */
import express from "express";
import { db } from "../config/database.js";
import { content, reports, users } from "../models/schema.js";
import { eq, gte, lt, desc, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { generatePDFReport } from "../services/pdf.js";
import { generateEnhancedPDFReport } from "../services/pdf-enhanced.js";
import { sendWeeklySummary } from "../services/email.js";
import { getUserUsageStats } from "../services/usage.js";
import path from "path";
import fs from "fs";

const router = express.Router();

// Generate and download PDF report
router.post("/generate-pdf", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.body;

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get content for the period
    const contentList = await db
      .select()
      .from(content)
      .where(
        and(
          eq(content.userId, userId),
          gte(content.createdAt, start),
          lt(content.createdAt, end)
        )
      )
      .orderBy(desc(content.createdAt));

    // Calculate statistics
    const totalContent = contentList.length;
    const totalReach = contentList.reduce(
      (sum, c) => sum + (c.potentialReachMetric || 0),
      0
    );
    const contentByType = {
      blog_post: contentList.filter((c) => c.contentType === "blog_post")
        .length,
      social_caption: contentList.filter(
        (c) => c.contentType === "social_caption"
      ).length,
    };

    // Prepare report data
    const reportData = {
      userEmail: req.user.email,
      reportDate: new Date(),
      totalContent,
      totalReach,
      contentByType,
      contentList,
      periodStart: start.toLocaleDateString(),
      periodEnd: end.toLocaleDateString(),
    };

    // Generate PDF
    const pdfResult = await generatePDFReport(reportData);

    // Save report record to database
    const newReport = await db
      .insert(reports)
      .values({
        userId,
        reportDate: new Date(),
        totalContentGenerated: totalContent,
        totalPotentialReach: totalReach,
        pdfReportPath: pdfResult.relativePath,
      })
      .returning();

    res.json({
      message: "Report generated successfully",
      report: newReport[0],
      downloadUrl: `/api/reports/download/${newReport[0].id}`,
    });
  } catch (error) {
    console.error("Error generating PDF report:", error);
    res.status(500).json({ message: "Failed to generate report" });
  }
});

// Generate enhanced PDF report with advanced analytics
router.post("/generate-enhanced-pdf", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.body;

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get content for the period
    const contentList = await db
      .select()
      .from(content)
      .where(
        and(
          eq(content.userId, userId),
          gte(content.createdAt, start),
          lt(content.createdAt, end)
        )
      )
      .orderBy(desc(content.createdAt));

    // Calculate statistics
    const totalContent = contentList.length;
    const totalReach = contentList.reduce(
      (sum, c) => sum + (c.potentialReachMetric || 0),
      0
    );
    const contentByType = {
      blog_post: contentList.filter((c) => c.contentType === "blog_post")
        .length,
      social_caption: contentList.filter(
        (c) => c.contentType === "social_caption"
      ).length,
    };

    // Prepare enhanced report data
    const reportData = {
      userEmail: req.user.email,
      reportDate: new Date(),
      totalContent,
      totalReach,
      contentByType,
      contentList,
      periodStart: start,
      periodEnd: end,
    };

    // Generate enhanced PDF
    const filename = await generateEnhancedPDFReport(reportData, userId);

    // Save report record to database
    const newReport = await db
      .insert(reports)
      .values({
        userId,
        reportDate: new Date(),
        totalContentGenerated: totalContent,
        totalPotentialReach: totalReach,
        pdfReportPath: filename,
      })
      .returning();

    res.json({
      message: "Enhanced report generated successfully",
      report: newReport[0],
      downloadUrl: `/api/reports/download/${newReport[0].id}`,
    });
  } catch (error) {
    console.error("Error generating enhanced PDF report:", error);
    res.status(500).json({ message: "Failed to generate enhanced report" });
  }
});

// Download PDF report
router.get("/download/:reportId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const reportId = parseInt(req.params.reportId);

    if (isNaN(reportId)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    // Get report record
    const report = await db
      .select()
      .from(reports)
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)))
      .limit(1);

    if (report.length === 0) {
      return res.status(404).json({ message: "Report not found" });
    }

    const reportRecord = report[0];
    const filepath = path.join(process.cwd(), reportRecord.pdfReportPath);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: "Report file not found" });
    }

    // Set headers for file download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="content-report-${reportRecord.id}.pdf"`
    );

    // Stream the file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error downloading report:", error);
    res.status(500).json({ message: "Failed to download report" });
  }
});

// Get user's reports history
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const userReports = await db
      .select()
      .from(reports)
      .where(eq(reports.userId, userId))
      .orderBy(desc(reports.createdAt));

    res.json({ reports: userReports });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

// Get dashboard summary
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get last 30 days of content
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last30DaysContent = await db
      .select()
      .from(content)
      .where(
        and(eq(content.userId, userId), gte(content.createdAt, thirtyDaysAgo))
      );

    // Get last 7 days of content
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last7DaysContent = await db
      .select()
      .from(content)
      .where(
        and(eq(content.userId, userId), gte(content.createdAt, sevenDaysAgo))
      );

    // Get all time content
    const allTimeContent = await db
      .select()
      .from(content)
      .where(eq(content.userId, userId));

    // Get usage statistics
    const usageStats = await getUserUsageStats(userId, 7);

    // Calculate metrics
    const dashboard = {
      last30Days: {
        totalContent: last30DaysContent.length,
        totalReach: last30DaysContent.reduce(
          (sum, c) => sum + (c.potentialReachMetric || 0),
          0
        ),
        contentByType: {
          blog_post: last30DaysContent.filter(
            (c) => c.contentType === "blog_post"
          ).length,
          social_caption: last30DaysContent.filter(
            (c) => c.contentType === "social_caption"
          ).length,
        },
        contentByStatus: {
          draft: last30DaysContent.filter((c) => c.status === "draft").length,
          scheduled: last30DaysContent.filter((c) => c.status === "scheduled")
            .length,
          posted: last30DaysContent.filter(
            (c) => c.status === "posted_simulated"
          ).length,
        },
      },
      last7Days: {
        totalContent: last7DaysContent.length,
        totalReach: last7DaysContent.reduce(
          (sum, c) => sum + (c.potentialReachMetric || 0),
          0
        ),
        averageDaily: Math.round((last7DaysContent.length / 7) * 100) / 100,
      },
      allTime: {
        totalContent: allTimeContent.length,
        totalReach: allTimeContent.reduce(
          (sum, c) => sum + (c.potentialReachMetric || 0),
          0
        ),
        averageReachPerContent:
          allTimeContent.length > 0
            ? Math.round(
                allTimeContent.reduce(
                  (sum, c) => sum + (c.potentialReachMetric || 0),
                  0
                ) / allTimeContent.length
              )
            : 0,
      },
      usage: usageStats,
      trends: calculateTrends(last30DaysContent),
    };

    res.json({ dashboard });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});

// Send weekly summary email
router.post("/send-weekly-summary", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get last 7 days of content
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyContent = await db
      .select()
      .from(content)
      .where(
        and(eq(content.userId, userId), gte(content.createdAt, sevenDaysAgo))
      )
      .orderBy(desc(content.createdAt));

    // Get upcoming scheduled content
    const upcomingScheduled = await db
      .select()
      .from(content)
      .where(
        and(
          eq(content.userId, userId),
          eq(content.status, "scheduled"),
          gte(content.scheduledAt, new Date())
        )
      )
      .orderBy(content.scheduledAt)
      .limit(5);

    // Prepare summary data
    const summaryData = {
      userName: req.user.email.split("@")[0], // Simple name extraction
      totalContent: weeklyContent.length,
      totalReach: weeklyContent.reduce(
        (sum, c) => sum + (c.potentialReachMetric || 0),
        0
      ),
      contentByType: {
        blog_post: weeklyContent.filter((c) => c.contentType === "blog_post")
          .length,
        social_caption: weeklyContent.filter(
          (c) => c.contentType === "social_caption"
        ).length,
      },
      upcomingScheduled,
      weeklyStats: {
        averageDaily: Math.round((weeklyContent.length / 7) * 100) / 100,
        mostProductiveDay: getMostProductiveDay(weeklyContent),
      },
    };

    // Send email
    await sendWeeklySummary(req.user.email, summaryData);

    res.json({
      message: "Weekly summary sent successfully",
      summary: summaryData,
    });
  } catch (error) {
    console.error("Error sending weekly summary:", error);
    res.status(500).json({ message: "Failed to send weekly summary" });
  }
});

// Helper function to calculate trends
const calculateTrends = (contentList) => {
  if (contentList.length === 0) return {};

  // Group by week
  const weeklyData = {};
  contentList.forEach((item) => {
    const week = getWeekKey(new Date(item.createdAt));
    if (!weeklyData[week]) {
      weeklyData[week] = { count: 0, reach: 0 };
    }
    weeklyData[week].count++;
    weeklyData[week].reach += item.potentialReachMetric || 0;
  });

  const weeks = Object.keys(weeklyData).sort();
  if (weeks.length < 2) return {};

  const latestWeek = weeklyData[weeks[weeks.length - 1]];
  const previousWeek = weeklyData[weeks[weeks.length - 2]];

  return {
    contentTrend: calculatePercentageChange(
      previousWeek.count,
      latestWeek.count
    ),
    reachTrend: calculatePercentageChange(previousWeek.reach, latestWeek.reach),
  };
};

// Helper function to get week key
const getWeekKey = (date) => {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  return startOfWeek.toISOString().split("T")[0];
};

// Helper function to calculate percentage change
const calculatePercentageChange = (oldValue, newValue) => {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return Math.round(((newValue - oldValue) / oldValue) * 100);
};

// Delete a report
router.delete("/:reportId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const reportId = parseInt(req.params.reportId);

    // Find the report to make sure it belongs to the user
    const [report] = await db
      .select()
      .from(reports)
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Delete the PDF file if it exists
    if (report.pdfReportPath && fs.existsSync(report.pdfReportPath)) {
      try {
        fs.unlinkSync(report.pdfReportPath);
      } catch (fileError) {
        console.warn("Could not delete PDF file:", fileError.message);
      }
    }

    // Delete the report from database
    await db.delete(reports).where(eq(reports.id, reportId));

    res.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Helper function to get most productive day
const getMostProductiveDay = (contentList) => {
  const dayCount = {};
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  contentList.forEach((item) => {
    const day = new Date(item.createdAt).getDay();
    const dayName = days[day];
    dayCount[dayName] = (dayCount[dayName] || 0) + 1;
  });

  return (
    Object.entries(dayCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A"
  );
};

export default router;
