import api from './api';

// Report types
export interface Report {
  id: number;
  userId: number;
  reportDate: string;
  totalContentGenerated: number;
  totalPotentialReach: number;
  pdfReportPath: string;
  createdAt: string;
}

export interface DashboardData {
  last30Days: {
    totalContent: number;
    totalReach: number;
    contentByType: {
      blog_post: number;
      social_caption: number;
    };
    contentByStatus: {
      draft: number;
      scheduled: number;
      posted: number;
    };
  };
  last7Days: {
    totalContent: number;
    totalReach: number;
    averageDaily: number;
  };
  allTime: {
    totalContent: number;
    totalReach: number;
    averageReachPerContent: number;
  };
  usage: {
    totalGenerations: number;
    totalApiCalls: number;
    averageDailyGenerations: number;
  };
  trends?: {
    contentTrend: number;
    reachTrend: number;
  };
}

// Reports API functions
export const reportsAPI = {
  // Generate PDF report
  generatePDFReport: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    message: string;
    report: Report;
    downloadUrl: string;
  }> => {
    const response = await api.post('/reports/generate-pdf', params || {});
    return response.data;
  },

  // Download PDF report
  downloadReport: async (reportId: number): Promise<Blob> => {
    const response = await api.get(`/reports/download/${reportId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Get reports history
  getReports: async (): Promise<{ reports: Report[] }> => {
    const response = await api.get('/reports');
    return response.data;
  },

  // Get dashboard data
  getDashboard: async (): Promise<{ dashboard: DashboardData }> => {
    const response = await api.get('/reports/dashboard');
    return response.data;
  },

  // Send weekly summary email
  sendWeeklySummary: async (): Promise<{ message: string }> => {
    const response = await api.post('/reports/send-weekly-summary');
    return response.data;
  },

  // Generate and download enhanced PDF report
  generateEnhancedReport: async (): Promise<void> => {
    try {
      const response = await api.get('/reports/enhanced-pdf', {
        responseType: 'blob',
      });
      
      // Create blob link to download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `enhanced-content-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading enhanced PDF report:', error);
      throw error;
    }
  },

  // Delete a report
  deleteReport: async (reportId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/reports/${reportId}`);
    return response.data;
  },
};
