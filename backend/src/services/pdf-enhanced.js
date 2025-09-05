/**
 * PDF Enhanced Report Generation Service
 * 
 * This module provides functions to generate PDF reports for content analytics,
 * including both a basic report and an enhanced report with advanced analytics and insights.
 * 
 * Dependencies:
 * - pdfkit: For PDF document creation.
 * - fs: For file system operations.
 * - path: For file path management.
 * - analytics.js: For fetching analytics and performance data.
 * 
 * Functions:
 * 
 * @function generatePDFReport
 * @async
 * @param {Object} reportData - Data required to generate the PDF report.
 * @param {string} reportData.userEmail - Email of the user.
 * @param {Date} reportData.reportDate - Date of the report.
 * @param {number} reportData.totalContent - Total number of content pieces generated.
 * @param {number} reportData.totalReach - Total potential reach.
 * @param {Object} reportData.contentByType - Breakdown of content by type.
 * @param {Array<Object>} reportData.contentList - List of content items.
 * @param {Date} reportData.periodStart - Start date of the report period.
 * @param {Date} reportData.periodEnd - End date of the report period.
 * @returns {Promise<string>} - Resolves to the generated PDF filename.
 * @description
 * Generates a basic PDF report summarizing content generation statistics and details.
 * 
 * @function generateEnhancedPDFReport
 * @async
 * @param {Object} reportData - Data required to generate the enhanced PDF report.
 * @param {string} userId - ID of the user for analytics lookup.
 * @returns {Promise<string>} - Resolves to the generated enhanced PDF filename.
 * @description
 * Generates an enhanced PDF report including advanced analytics, trends, performance scores,
 * insights, recommendations, and a detailed content breakdown.
 * 
 * @function addSectionHeader
 * @private
 * @param {PDFDocument} doc - The PDFDocument instance.
 * @param {string} title - Section title to add as a header.
 * @description
 * Adds a styled section header to the PDF document.
 * 
 * @function generateInsights
 * @private
 * @param {Object} analytics - Analytics data for the report.
 * @param {Object} performance - Performance data for the report.
 * @returns {Array<string>} - List of generated insights and recommendations.
 * @description
 * Generates insights and recommendations based on analytics and performance data.
 * 
 * @file
 * @module services/pdf-enhanced
 */
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import {
  getAdvancedAnalytics,
  getContentPerformanceScores,
} from "./analytics.js";

// Ensure reports directory exists
const reportsDir = path.join(process.cwd(), "reports");
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Original PDF report generation (for backward compatibility)
export const generatePDFReport = async (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        userEmail,
        reportDate,
        totalContent,
        totalReach,
        contentByType,
        contentList,
        periodStart,
        periodEnd,
      } = reportData;

      // Create a unique filename
      const timestamp = new Date().getTime();
      const filename = `content-report-${timestamp}.pdf`;
      const filepath = path.join(reportsDir, filename);

      // Create PDF document with proper font
      const doc = new PDFDocument({
        margin: 50,
        info: {
          Title: "Content Generation Report",
          Author: "AI Content Generator",
          Creator: "AI Content Generator",
        },
      });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Use standard font to avoid encoding issues
      doc.font("Helvetica");

      // Header
      doc
        .fontSize(24)
        .fillColor("#4F46E5")
        .text("Content Generation Report", { align: "center" });

      doc
        .fontSize(12)
        .fillColor("#6B7280")
        .text(`Generated on ${new Date().toLocaleDateString()}`, {
          align: "center",
        });

      doc.moveDown(2);

      // User Information
      doc.fontSize(16).fillColor("#1F2937").text("Report Summary");

      doc.fontSize(1).fillColor("#E5E7EB").text("_".repeat(100));

      doc.moveDown(1);

      // Summary stats
      const summaryData = [
        [
          "Report Period:",
          `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`,
        ],
        ["User:", userEmail],
        ["Total Content Generated:", `${totalContent} pieces`],
        ["Total Potential Reach:", `${totalReach.toLocaleString()} people`],
        [
          "Average Reach per Content:",
          totalContent > 0
            ? `${Math.round(totalReach / totalContent).toLocaleString()} people`
            : "0",
        ],
      ];

      summaryData.forEach(([label, value]) => {
        doc
          .fontSize(11)
          .fillColor("#374151")
          .text(`${label} ${value}`, { indent: 20 });
      });

      doc.moveDown(2);

      // Content breakdown
      doc.fontSize(16).fillColor("#1F2937").text("Content Breakdown");

      doc.fontSize(1).fillColor("#E5E7EB").text("_".repeat(100));

      doc.moveDown(1);

      // Content by type
      Object.entries(contentByType).forEach(([type, count]) => {
        const percentage =
          totalContent > 0 ? ((count / totalContent) * 100).toFixed(1) : "0";
        doc
          .fontSize(11)
          .fillColor("#374151")
          .text(
            `${type
              .replace("_", " ")
              .toUpperCase()}: ${count} pieces (${percentage}%)`,
            { indent: 20 }
          );
      });

      doc.moveDown(2);

      // Content list
      if (contentList && contentList.length > 0) {
        doc.fontSize(16).fillColor("#1F2937").text("Content Details");

        doc.fontSize(1).fillColor("#E5E7EB").text("_".repeat(100));

        doc.moveDown(1);

        contentList.slice(0, 15).forEach((item, index) => {
          if (doc.y > 700) {
            doc.addPage();
          }

          doc
            .fontSize(12)
            .fillColor("#1F2937")
            .text(`${index + 1}. ${item.topic}`);

          doc
            .fontSize(10)
            .fillColor("#6B7280")
            .text(
              `   Type: ${item.contentType} | Created: ${new Date(
                item.createdAt
              ).toLocaleDateString()}`
            )
            .text(
              `   Potential Reach: ${(
                item.potentialReachMetric || 0
              ).toLocaleString()} people`
            );

          if (item.scheduledAt) {
            doc.text(
              `   Scheduled: ${new Date(item.scheduledAt).toLocaleString()}`
            );
          }

          doc.moveDown(0.5);
        });
      }

      // Footer
      doc
        .fontSize(8)
        .fillColor("#9CA3AF")
        .text(
          `Report generated by AI Content Generator`,
          50,
          doc.page.height - 30,
          { align: "center" }
        );

      doc.end();

      stream.on("finish", () => {
        resolve(filename);
      });

      stream.on("error", (error) => {
        reject(error);
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      reject(error);
    }
  });
};

// Enhanced PDF report generation with charts and advanced analytics
export const generateEnhancedPDFReport = async (reportData, userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const {
        userEmail,
        reportDate,
        totalContent,
        totalReach,
        contentByType,
        contentList,
        periodStart,
        periodEnd,
      } = reportData;

      // Get enhanced analytics
      const analytics = await getAdvancedAnalytics(
        userId,
        periodStart,
        periodEnd
      );
      const performance = await getContentPerformanceScores(userId);

      // Create a unique filename
      const timestamp = new Date().getTime();
      const filename = `enhanced-content-report-${timestamp}.pdf`;
      const filepath = path.join(reportsDir, filename);

      // Create PDF document
      const doc = new PDFDocument({
        margin: 50,
        info: {
          Title: "Enhanced Content Generation Report",
          Author: "AI Content Generator",
          Creator: "AI Content Generator",
        },
      });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Use standard font
      doc.font("Helvetica");

      // Header with enhanced styling
      doc
        .fontSize(28)
        .fillColor("#4F46E5")
        .text("Enhanced Content Report", { align: "center" });

      doc
        .fontSize(12)
        .fillColor("#6B7280")
        .text(`Generated on ${new Date().toLocaleDateString()}`, {
          align: "center",
        });

      doc.moveDown(2);

      // Executive Summary Section
      addSectionHeader(doc, "Executive Summary");

      const summary = [
        `Report Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`,
        `Total Content Generated: ${totalContent} pieces`,
        `Total Potential Reach: ${totalReach.toLocaleString()} people`,
        `Average Performance Score: ${performance.insights.averageScore}%`,
        `Top Performing Content Type: ${
          performance.insights.bestPerformingType?.type || "N/A"
        }`,
        `Best Platform: ${
          performance.insights.bestPerformingPlatform?.platform || "N/A"
        }`,
      ];

      summary.forEach((line) => {
        doc.fontSize(11).fillColor("#374151").text(`• ${line}`, { indent: 20 });
      });

      doc.moveDown(2);

      // Performance Trends Section
      addSectionHeader(doc, "Performance Trends");

      if (analytics.trends) {
        const contentTrendText =
          analytics.trends.contentTrend >= 0
            ? `+${analytics.trends.contentTrend.toFixed(1)}% increase`
            : `${analytics.trends.contentTrend.toFixed(1)}% decrease`;

        const reachTrendText =
          analytics.trends.reachTrend >= 0
            ? `+${analytics.trends.reachTrend.toFixed(1)}% increase`
            : `${analytics.trends.reachTrend.toFixed(1)}% decrease`;

        doc
          .fontSize(11)
          .fillColor("#374151")
          .text(
            `Content Generation Trend: ${contentTrendText} vs previous period`,
            { indent: 20 }
          )
          .text(`Reach Trend: ${reachTrendText} vs previous period`, {
            indent: 20,
          });
      }

      doc.moveDown(1);

      // Content Distribution Chart (Text-based)
      addSectionHeader(doc, "Content Distribution");

      if (analytics.contentByType && analytics.contentByType.length > 0) {
        analytics.contentByType.forEach((item) => {
          const percentage =
            totalContent > 0
              ? ((item.count / totalContent) * 100).toFixed(1)
              : "0";
          doc
            .fontSize(11)
            .fillColor("#374151")
            .text(
              `${item.contentType} (${item.platformTarget || "General"}): ${
                item.count
              } pieces (${percentage}%)`,
              { indent: 20 }
            );
        });
      }

      doc.moveDown(2);

      // Daily Activity Chart (Text-based)
      addSectionHeader(doc, "Daily Activity Trends");

      if (analytics.dailyTrends && analytics.dailyTrends.length > 0) {
        doc
          .fontSize(10)
          .fillColor("#374151")
          .text("Date | Content Created | Potential Reach", { indent: 20 });

        doc.text("".padEnd(50, "-"), { indent: 20 });

        analytics.dailyTrends.forEach((day) => {
          const dateStr = new Date(day.date).toLocaleDateString();
          const reachStr = (day.totalReach || 0).toLocaleString();
          doc.text(`${dateStr} | ${day.count} | ${reachStr}`, { indent: 20 });
        });
      }

      doc.moveDown(2);

      // Top Performing Content Section
      addSectionHeader(doc, "Top Performing Content");

      if (performance.contentScores && performance.contentScores.length > 0) {
        const topContent = performance.contentScores
          .sort((a, b) => b.performanceScore - a.performanceScore)
          .slice(0, 5);

        topContent.forEach((item, index) => {
          doc
            .fontSize(10)
            .fillColor("#1F2937")
            .text(`${index + 1}. ${item.topic}`, { indent: 20 });

          doc
            .fontSize(9)
            .fillColor("#6B7280")
            .text(
              `   Score: ${item.performanceScore}% | Type: ${
                item.contentType
              } | Reach: ${item.potentialReachMetric || 0}`,
              { indent: 20 }
            );

          if (item.qualityFactors) {
            const factors = [];
            if (item.qualityFactors.hasHashtags) factors.push("Hashtags");
            if (item.qualityFactors.hasQuestions) factors.push("Questions");
            if (item.qualityFactors.hasCallToAction) factors.push("CTA");
            if (item.qualityFactors.optimalLength)
              factors.push("Optimal Length");

            if (factors.length > 0) {
              doc.text(`   Quality Factors: ${factors.join(", ")}`, {
                indent: 20,
              });
            }
          }

          doc.moveDown(0.5);
        });
      }

      doc.moveDown(2);

      // Insights and Recommendations Section
      addSectionHeader(doc, "Insights & Recommendations");

      const insights = generateInsights(analytics, performance);
      insights.forEach((insight) => {
        doc
          .fontSize(11)
          .fillColor("#374151")
          .text(`• ${insight}`, { indent: 20 });
      });

      doc.moveDown(2);

      // Detailed Content List Section (if space allows)
      if (doc.y < 600) {
        // Check if there's enough space
        addSectionHeader(doc, "Content Details");

        contentList.slice(0, 10).forEach((item) => {
          // Limit to 10 items
          doc
            .fontSize(9)
            .fillColor("#1F2937")
            .text(`${item.topic} (${item.contentType})`, { indent: 20 });

          doc
            .fontSize(8)
            .fillColor("#6B7280")
            .text(
              `Created: ${new Date(
                item.createdAt
              ).toLocaleDateString()} | Reach: ${
                item.potentialReachMetric || 0
              }`,
              { indent: 20 }
            );

          doc.moveDown(0.3);
        });
      }

      // Footer
      doc
        .fontSize(8)
        .fillColor("#9CA3AF")
        .text(
          `Report generated by AI Content Generator for ${userEmail}`,
          50,
          doc.page.height - 30,
          { align: "center" }
        );

      doc.end();

      stream.on("finish", () => {
        resolve(filename);
      });

      stream.on("error", (error) => {
        reject(error);
      });
    } catch (error) {
      console.error("Enhanced PDF generation error:", error);
      reject(error);
    }
  });
};

// Helper function to add section headers
function addSectionHeader(doc, title) {
  doc.fontSize(16).fillColor("#1F2937").text(title);

  doc.fontSize(1).fillColor("#E5E7EB").text("".padEnd(100, "_"));

  doc.moveDown(0.5);
}

// Generate insights based on analytics data
function generateInsights(analytics, performance) {
  const insights = [];

  // Content volume insights
  if (analytics.overview?.total > 0) {
    if (analytics.trends?.contentTrend > 10) {
      insights.push(
        "Great momentum! Your content generation has increased significantly."
      );
    } else if (analytics.trends?.contentTrend < -10) {
      insights.push(
        "Consider increasing your content generation frequency for better engagement."
      );
    }
  }

  // Performance insights
  if (performance.insights?.averageScore > 75) {
    insights.push(
      "Excellent content quality! Your average performance score is above 75%."
    );
  } else if (performance.insights?.averageScore < 50) {
    insights.push(
      "Focus on content quality. Try adding more engaging elements like questions and call-to-actions."
    );
  }

  // Platform insights
  if (performance.insights?.bestPerformingPlatform) {
    insights.push(
      `${performance.insights.bestPerformingPlatform.platform} shows the best performance. Consider focusing more content on this platform.`
    );
  }

  // Content type insights
  if (performance.insights?.bestPerformingType) {
    insights.push(
      `${performance.insights.bestPerformingType.type} content performs best with an average score of ${performance.insights.bestPerformingType.averageScore}%.`
    );
  }

  // Reach insights
  if (analytics.trends?.reachTrend > 20) {
    insights.push(
      "Your content reach is growing rapidly! Keep up the current content strategy."
    );
  }

  // Default insights if none generated
  if (insights.length === 0) {
    insights.push(
      "Continue creating consistent, quality content to improve your metrics."
    );
    insights.push(
      "Experiment with different content types and platforms to find what works best."
    );
    insights.push(
      "Use hashtags, questions, and call-to-actions to boost engagement."
    );
  }

  return insights;
}
