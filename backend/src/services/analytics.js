/**
 * @file analytics.js
 * @description
 * Enhanced analytics and metrics service for AI-powered content generation and scheduling.
 * Provides advanced engagement prediction algorithms, analytics calculations, and content performance scoring.
 * Utilizes caching for performance and supports platform- and content-type-specific metrics.
 *
 * Exports:
 * - calculateEngagementMetrics(contentItem): Calculates estimated reach, engagement, clicks, shares, and quality factors for a content item.
 * - getAdvancedAnalytics(userId, startDate, endDate): Returns advanced analytics and trends for a user's content within a date range.
 * - getContentPerformanceScores(userId): Returns performance scores and insights for a user's recent content.
 *
 * Helper Functions:
 * - getBestPerformingType(contentItems): Determines the best performing content type.
 * - getBestPerformingPlatform(contentItems): Determines the best performing platform.
 *
 * Dependencies:
 * - Database access via Drizzle ORM.
 * - ContentCache for caching analytics results.
 * - Content, users, and userUsage models.
 */
// Enhanced analytics and metrics service
import { db } from "../config/database.js";
import { content, users, userUsage } from "../models/schema.js";
import { eq, gte, lt, desc, sql, and, count, avg, sum } from "drizzle-orm";
import { ContentCache } from "./cache.js";

// Enhanced engagement prediction algorithms
export const calculateEngagementMetrics = (contentItem) => {
  const {
    contentType,
    platformTarget,
    wordCount,
    characterCount,
    generatedText,
  } = contentItem;

  let baseEngagement = 100;
  let reachMultiplier = 1;
  let engagementRate = 0.02; // 2% base engagement rate

  // Platform-specific adjustments
  switch (platformTarget) {
    case "Twitter":
      reachMultiplier = 1.2;
      engagementRate = 0.035; // Twitter tends to have higher engagement
      break;
    case "LinkedIn":
      reachMultiplier = 0.8;
      engagementRate = 0.025; // Professional content, moderate engagement
      break;
    case "Facebook":
      reachMultiplier = 1.5;
      engagementRate = 0.02;
      break;
    case "Instagram":
      reachMultiplier = 1.8;
      engagementRate = 0.045; // Visual platform, higher engagement
      break;
    default:
      reachMultiplier = 1;
  }

  // Content type adjustments
  switch (contentType) {
    case "blog_post":
      baseEngagement *= 1.3; // Blog posts tend to have better reach
      engagementRate *= 0.8; // But lower immediate engagement rate
      break;
    case "social_caption":
      baseEngagement *= 1.1;
      engagementRate *= 1.2; // Social captions get quick engagement
      break;
  }

  // Content quality indicators
  const hasHashtags = /#\w+/g.test(generatedText);
  const hasQuestions = /\?/g.test(generatedText);
  const hasCallToAction =
    /\b(click|visit|check|learn|discover|try|get|download|sign up|subscribe)\b/gi.test(
      generatedText
    );
  const hasEmojis =
    /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}]/gu.test(
      generatedText
    );

  // Quality score adjustments
  let qualityMultiplier = 1;
  if (hasHashtags) qualityMultiplier += 0.15;
  if (hasQuestions) qualityMultiplier += 0.1;
  if (hasCallToAction) qualityMultiplier += 0.2;
  if (hasEmojis && platformTarget !== "LinkedIn") qualityMultiplier += 0.1;

  // Optimal length adjustments
  let lengthMultiplier = 1;
  if (contentType === "social_caption") {
    if (characterCount > 50 && characterCount < 150) lengthMultiplier = 1.2;
    else if (characterCount > 280) lengthMultiplier = 0.7;
  } else if (contentType === "blog_post") {
    if (wordCount > 100 && wordCount < 300) lengthMultiplier = 1.1;
    else if (wordCount < 50) lengthMultiplier = 0.8;
  }

  // Calculate final metrics
  const potentialReach = Math.round(
    baseEngagement * reachMultiplier * qualityMultiplier * lengthMultiplier
  );
  const estimatedEngagements = Math.round(potentialReach * engagementRate);
  const estimatedClicks = Math.round(estimatedEngagements * 0.15); // 15% of engagements become clicks
  const estimatedShares = Math.round(estimatedEngagements * 0.08); // 8% get shared
  const engagementScore = Math.round(
    (estimatedEngagements / potentialReach) * 100
  );

  return {
    potentialReach,
    estimatedEngagements,
    estimatedClicks,
    estimatedShares,
    engagementScore,
    qualityFactors: {
      hasHashtags,
      hasQuestions,
      hasCallToAction,
      hasEmojis,
      optimalLength: lengthMultiplier > 1,
    },
  };
};

// Advanced analytics calculations
export const getAdvancedAnalytics = async (userId, startDate, endDate) => {
  try {
    // Check cache first
    const cachedAnalytics = await ContentCache.getCachedAnalytics(
      userId,
      startDate,
      endDate
    );
    if (cachedAnalytics) {
      console.log("Analytics served from cache");
      return cachedAnalytics;
    }
    // Basic content stats
    const contentStats = await db
      .select({
        total: count(),
        avgWordCount: avg(content.wordCount),
        avgCharacterCount: avg(content.characterCount),
        avgReach: avg(content.potentialReachMetric),
        totalReach: sum(content.potentialReachMetric),
      })
      .from(content)
      .where(
        and(
          eq(content.userId, userId),
          gte(content.createdAt, startDate),
          lt(content.createdAt, endDate)
        )
      );

    // Content by type and platform
    const contentByType = await db
      .select({
        contentType: content.contentType,
        platformTarget: content.platformTarget,
        count: count(),
        avgReach: avg(content.potentialReachMetric),
      })
      .from(content)
      .where(
        and(
          eq(content.userId, userId),
          gte(content.createdAt, startDate),
          lt(content.createdAt, endDate)
        )
      )
      .groupBy(content.contentType, content.platformTarget);

    // Daily trends
    const dailyTrends = await db
      .select({
        date: sql`DATE(${content.createdAt})`,
        count: count(),
        totalReach: sum(content.potentialReachMetric),
      })
      .from(content)
      .where(
        and(
          eq(content.userId, userId),
          gte(content.createdAt, startDate),
          lt(content.createdAt, endDate)
        )
      )
      .groupBy(sql`DATE(${content.createdAt})`)
      .orderBy(sql`DATE(${content.createdAt})`);

    // Performance comparison (current vs previous period)
    const periodLength = endDate - startDate;
    const previousStart = new Date(startDate.getTime() - periodLength);
    const previousEnd = startDate;

    const previousStats = await db
      .select({
        total: count(),
        totalReach: sum(content.potentialReachMetric),
      })
      .from(content)
      .where(
        and(
          eq(content.userId, userId),
          gte(content.createdAt, previousStart),
          lt(content.createdAt, previousEnd)
        )
      );

    // Calculate trends
    const currentTotal = contentStats[0]?.total || 0;
    const previousTotal = previousStats[0]?.total || 0;
    const currentReach = contentStats[0]?.totalReach || 0;
    const previousReach = previousStats[0]?.totalReach || 0;

    const contentTrend =
      previousTotal > 0
        ? ((currentTotal - previousTotal) / previousTotal) * 100
        : 0;
    const reachTrend =
      previousReach > 0
        ? ((currentReach - previousReach) / previousReach) * 100
        : 0;

    // Ensure all overview fields have default values (never null)
    const overview = {
      total: contentStats[0]?.total || 0,
      avgWordCount: contentStats[0]?.avgWordCount || 0,
      avgCharacterCount: contentStats[0]?.avgCharacterCount || 0,
      avgReach: contentStats[0]?.avgReach || 0,
      totalReach: contentStats[0]?.totalReach || 0,
    };

    // Ensure contentByType has no null values
    const cleanContentByType = contentByType.map((item) => ({
      ...item,
      avgReach: item.avgReach || 0,
      count: item.count || 0,
    }));

    // Ensure dailyTrends has no null values
    const cleanDailyTrends = dailyTrends.map((day) => ({
      ...day,
      count: day.count || 0,
      totalReach: day.totalReach || 0,
    }));

    const result = {
      overview,
      contentByType: cleanContentByType,
      dailyTrends: cleanDailyTrends,
      trends: {
        contentTrend: Math.round(contentTrend * 100) / 100,
        reachTrend: Math.round(reachTrend * 100) / 100,
      },
      periodComparison: {
        current: { total: currentTotal, reach: currentReach },
        previous: { total: previousTotal, reach: previousReach },
      },
    };

    // Cache the result for 30 minutes
    await ContentCache.setCachedAnalytics(
      userId,
      startDate,
      endDate,
      result,
      1800
    );

    return result;
  } catch (error) {
    console.error("Error calculating advanced analytics:", error);
    throw error;
  }
};

// Content performance scoring
export const getContentPerformanceScores = async (userId) => {
  try {
    // Check cache first
    const cachedPerformance = await ContentCache.getCachedPerformance(userId);
    if (cachedPerformance) {
      console.log("Performance scores served from cache");
      return cachedPerformance;
    }
    const contentItems = await db
      .select()
      .from(content)
      .where(eq(content.userId, userId))
      .orderBy(desc(content.createdAt))
      .limit(50); // Last 50 pieces of content

    const scoredContent = contentItems.map((item) => {
      const metrics = calculateEngagementMetrics(item);
      return {
        ...item,
        performanceScore: metrics.engagementScore,
        estimatedEngagements: metrics.estimatedEngagements,
        estimatedClicks: metrics.estimatedClicks,
        estimatedShares: metrics.estimatedShares,
        qualityFactors: metrics.qualityFactors,
      };
    });

    // Calculate averages and insights
    const avgScore =
      scoredContent.reduce((sum, item) => sum + item.performanceScore, 0) /
      scoredContent.length;
    const topPerformers = scoredContent.filter(
      (item) => item.performanceScore > avgScore + 10
    );
    const needsImprovement = scoredContent.filter(
      (item) => item.performanceScore < avgScore - 10
    );

    const result = {
      contentScores: scoredContent,
      insights: {
        averageScore: Math.round(avgScore),
        topPerformersCount: topPerformers.length,
        needsImprovementCount: needsImprovement.length,
        bestPerformingType: getBestPerformingType(scoredContent),
        bestPerformingPlatform: getBestPerformingPlatform(scoredContent),
      },
    };

    // Cache the result for 1 hour
    await ContentCache.setCachedPerformance(userId, result, 3600);

    return result;
  } catch (error) {
    console.error("Error calculating content performance scores:", error);
    throw error;
  }
};

// Helper functions
const getBestPerformingType = (contentItems) => {
  const typeScores = {};
  contentItems.forEach((item) => {
    if (!typeScores[item.contentType]) {
      typeScores[item.contentType] = { total: 0, count: 0 };
    }
    typeScores[item.contentType].total += item.performanceScore;
    typeScores[item.contentType].count++;
  });

  let bestType = null;
  let bestAverage = 0;
  Object.entries(typeScores).forEach(([type, data]) => {
    const average = data.total / data.count;
    if (average > bestAverage) {
      bestAverage = average;
      bestType = type;
    }
  });

  return { type: bestType, averageScore: Math.round(bestAverage) };
};

const getBestPerformingPlatform = (contentItems) => {
  const platformScores = {};
  contentItems.forEach((item) => {
    if (!item.platformTarget) return;
    if (!platformScores[item.platformTarget]) {
      platformScores[item.platformTarget] = { total: 0, count: 0 };
    }
    platformScores[item.platformTarget].total += item.performanceScore;
    platformScores[item.platformTarget].count++;
  });

  let bestPlatform = null;
  let bestAverage = 0;
  Object.entries(platformScores).forEach(([platform, data]) => {
    const average = data.total / data.count;
    if (average > bestAverage) {
      bestAverage = average;
      bestPlatform = platform;
    }
  });

  return { platform: bestPlatform, averageScore: Math.round(bestAverage) };
};
