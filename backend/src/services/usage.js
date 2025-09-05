import { db } from '../config/database.js';
import { userUsage } from '../models/schema.js';
import { eq, and, gte, lt } from 'drizzle-orm';

// Check if user has exceeded daily limits
export const checkUserLimits = async (userId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's usage
    const todayUsage = await db
      .select()
      .from(userUsage)
      .where(
        and(
          eq(userUsage.userId, userId),
          gte(userUsage.date, today),
          lt(userUsage.date, tomorrow)
        )
      )
      .limit(1);

    const currentGenerations = todayUsage.length > 0 ? todayUsage[0].contentGenerationsCount : 0;
    const currentApiCalls = todayUsage.length > 0 ? todayUsage[0].apiCallsCount : 0;
    
    const maxGenerationsPerDay = parseInt(process.env.MAX_CONTENT_GENERATIONS_PER_USER_PER_DAY) || 50;
    const maxApiCallsPerDay = maxGenerationsPerDay + 10; // Allow some buffer for API calls

    return {
      canGenerate: currentGenerations < maxGenerationsPerDay,
      canMakeApiCall: currentApiCalls < maxApiCallsPerDay,
      currentGenerations,
      maxGenerations: maxGenerationsPerDay,
      currentApiCalls,
      maxApiCalls: maxApiCallsPerDay,
      remainingGenerations: Math.max(0, maxGenerationsPerDay - currentGenerations),
    };
  } catch (error) {
    console.error('Error checking user limits:', error);
    throw new Error('Failed to check usage limits');
  }
};

// Track content generation
export const trackContentGeneration = async (userId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if record exists for today
    const existingUsage = await db
      .select()
      .from(userUsage)
      .where(
        and(
          eq(userUsage.userId, userId),
          gte(userUsage.date, today),
          lt(userUsage.date, tomorrow)
        )
      )
      .limit(1);

    if (existingUsage.length > 0) {
      // Update existing record
      await db
        .update(userUsage)
        .set({
          contentGenerationsCount: existingUsage[0].contentGenerationsCount + 1,
          apiCallsCount: existingUsage[0].apiCallsCount + 1,
        })
        .where(eq(userUsage.id, existingUsage[0].id));
    } else {
      // Create new record
      await db
        .insert(userUsage)
        .values({
          userId,
          date: today,
          contentGenerationsCount: 1,
          apiCallsCount: 1,
        });
    }
  } catch (error) {
    console.error('Error tracking content generation:', error);
    throw new Error('Failed to track usage');
  }
};

// Track API call (for non-generation API calls)
export const trackApiCall = async (userId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if record exists for today
    const existingUsage = await db
      .select()
      .from(userUsage)
      .where(
        and(
          eq(userUsage.userId, userId),
          gte(userUsage.date, today),
          lt(userUsage.date, tomorrow)
        )
      )
      .limit(1);

    if (existingUsage.length > 0) {
      // Update existing record
      await db
        .update(userUsage)
        .set({
          apiCallsCount: existingUsage[0].apiCallsCount + 1,
        })
        .where(eq(userUsage.id, existingUsage[0].id));
    } else {
      // Create new record
      await db
        .insert(userUsage)
        .values({
          userId,
          date: today,
          contentGenerationsCount: 0,
          apiCallsCount: 1,
        });
    }
  } catch (error) {
    console.error('Error tracking API call:', error);
    // Don't throw error for API call tracking as it's not critical
  }
};

// Get user usage statistics
export const getUserUsageStats = async (userId, days = 7) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const usage = await db
      .select()
      .from(userUsage)
      .where(
        and(
          eq(userUsage.userId, userId),
          gte(userUsage.date, startDate)
        )
      )
      .orderBy(userUsage.date);

    const totalGenerations = usage.reduce((sum, day) => sum + day.contentGenerationsCount, 0);
    const totalApiCalls = usage.reduce((sum, day) => sum + day.apiCallsCount, 0);

    return {
      totalGenerations,
      totalApiCalls,
      dailyUsage: usage,
      averageDailyGenerations: Math.round(totalGenerations / days * 100) / 100,
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    throw new Error('Failed to get usage statistics');
  }
};

export default {
  checkUserLimits,
  trackContentGeneration,
  trackApiCall,
  getUserUsageStats,
};
