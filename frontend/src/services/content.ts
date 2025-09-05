import api from './api';

// Content types
export interface ContentItem {
  id: number;
  userId: number;
  topic: string;
  keyword?: string;
  generatedText: string;
  createdAt: string;
  scheduledAt?: string;
  status: 'draft' | 'scheduled' | 'posted_simulated';
  potentialReachMetric: number;
  contentType: 'blog_post' | 'social_caption';
  platformTarget?: string;
  wordCount: number;
  characterCount: number;
  userEdited: boolean;
  updatedAt: string;
}

export interface ContentGenerationRequest {
  topic: string;
  keyword?: string;
  contentType: 'blog_post' | 'social_caption';
  platformTarget?: 'Twitter' | 'LinkedIn' | 'Facebook' | 'Instagram' | 'General';
}

export interface ContentListResponse {
  content: ContentItem[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ContentStats {
  total: number;
  draft: number;
  scheduled: number;
  posted: number;
  totalPotentialReach: number;
  contentTypes: {
    blog_post: number;
    social_caption: number;
  };
  upcomingScheduled: ContentItem[];
}

// Enhanced analytics interfaces
export interface AdvancedAnalytics {
  overview: {
    total: number;
    avgWordCount: number;
    avgCharacterCount: number;
    avgReach: number;
    totalReach: number;
  };
  contentByType: Array<{
    contentType: string;
    platformTarget: string;
    count: number;
    avgReach: number;
  }>;
  dailyTrends: Array<{
    date: string;
    count: number;
    totalReach: number;
  }>;
  trends: {
    contentTrend: number;
    reachTrend: number;
  };
  periodComparison: {
    current: { total: number; reach: number };
    previous: { total: number; reach: number };
  };
}

export interface ContentPerformance {
  contentScores: Array<ContentItem & {
    performanceScore: number;
    estimatedEngagements: number;
    estimatedClicks: number;
    estimatedShares: number;
    qualityFactors: {
      hasHashtags: boolean;
      hasQuestions: boolean;
      hasCallToAction: boolean;
      hasEmojis: boolean;
      optimalLength: boolean;
    };
  }>;
  insights: {
    averageScore: number;
    topPerformersCount: number;
    needsImprovementCount: number;
    bestPerformingType: { type: string; averageScore: number } | null;
    bestPerformingPlatform: { platform: string; averageScore: number } | null;
  };
}

// Content API functions
export const contentAPI = {
  // Generate new content
  generateContent: async (data: ContentGenerationRequest): Promise<{
    message: string;
    content: ContentItem;
    remainingGenerations: number;
  }> => {
    const response = await api.post('/content/generate', data);
    return response.data;
  },

  // Get user's content
  getContent: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ContentListResponse> => {
    const response = await api.get('/content', { params });
    return response.data;
  },

  // Get specific content item
  getContentById: async (id: number): Promise<{ content: ContentItem }> => {
    const response = await api.get(`/content/${id}`);
    return response.data;
  },

  // Schedule content
  scheduleContent: async (id: number, scheduledAt: string): Promise<{
    message: string;
    content: ContentItem;
  }> => {
    const response = await api.patch(`/content/${id}/schedule`, { scheduledAt });
    return response.data;
  },

  // Edit content
  editContent: async (id: number, data: {
    topic?: string;
    keyword?: string;
    generatedText?: string;
    contentType?: string;
    platformTarget?: string;
    status?: string;
    scheduledAt?: string;
  }): Promise<{
    message: string;
    content: ContentItem;
  }> => {
    const response = await api.put(`/content/${id}`, data);
    return response.data;
  },

  // Delete content
  deleteContent: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/content/${id}`);
    return response.data;
  },

  // Simulate posting content
  postContent: async (id: number): Promise<{
    message: string;
    content: ContentItem;
  }> => {
    const response = await api.patch(`/content/${id}/post`);
    return response.data;
  },

  // Get content statistics
  getContentStats: async (): Promise<{ stats: ContentStats }> => {
    const response = await api.get('/content/stats/overview');
    return response.data;
  },

  // Enhanced analytics functions
  getAdvancedAnalytics: async (timeframe: string = '7'): Promise<AdvancedAnalytics> => {
    const response = await api.get(`/content/analytics/advanced?timeframe=${timeframe}`);
    return response.data.analytics;
  },

  getContentPerformance: async (): Promise<ContentPerformance> => {
    const response = await api.get('/content/analytics/performance');
    return response.data.performance;
  },
};
