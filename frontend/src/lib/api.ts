import axios from 'axios';
import { Article, User, Website, Keyword, WebsiteAnalysis, CrawledPage } from '@/types';

// ... axiosInstance și interceptorii rămân neschimbați ...
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

axiosInstance.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ... Interfața AnalyticsData rămâne neschimbată ...
export interface AnalyticsData {
  totalKeywords: number;
  avgPosition: number;
  totalTraffic: number;
  totalUsers: number;
  positionDistribution: { top3: number; top10: number; top50: number; beyond50: number; };
  trafficTrend: Array<{ date: string; organic: number; users: number; }>;
  backlinksCount: number;
  topContentGaps: Array<{ keyword: string; opportunityScore: number; }>;
  deviceBreakdown: { desktop: number; mobile: number; tablet: number; };
}

// NOU: Interfața pentru datele de pe dashboard
export interface DashboardOverviewData {
  stats: {
    totalWebsites: number;
    totalKeywords: number;
    totalArticles: number;
    monthlyTraffic: number;
  };
  keywordPerformance: {
    avgPosition: number;
    distribution: {
      top3: number;
      top10: number;
      beyond10: number;
    };
  };
  recentActivities: any[]; // Poți defini o interfață specifică pentru Activity
  websites: {
    id: number;
    name: string;
    domain: string;
    crawlStatus: 'pending' | 'crawling' | 'completed' | 'failed';
    lastCrawledAt: string | null;
  }[];
}


// ... authApi rămâne neschimbat ...
export const authApi = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    const response = await axiosInstance.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (userData: Partial<User & { password?: string }>): Promise<{ user: User; token: string }> => {
    const response = await axiosInstance.post('/auth/register', userData);
    return response.data;
  },
  verifyToken: async (): Promise<{ valid: boolean; user: User }> => {
    const response = await axiosInstance.get('/auth/verify-token');
    return response.data;
  },
};

export const dashboardApi = {
  getAnalytics: async (filters: { dateRange?: string; websiteId?: string }): Promise<{ success: boolean; data: AnalyticsData | null }> => {
    const response = await axiosInstance.get('/dashboard/analytics', { params: filters });
    return response.data;
  },
  // NOU: Funcția pentru a prelua datele de overview
  getDashboardOverview: async (): Promise<{ success: boolean; data: DashboardOverviewData }> => {
    const response = await axiosInstance.get('/dashboard/overview');
    return response.data;
  }
};

export const websitesApi = {
  getAll: async (): Promise<{ websites: Website[] }> => {
    const response = await axiosInstance.get('/websites');
    return response.data;
  },
  getById: async (id: number): Promise<{ website: Website }> => {
    const response = await axiosInstance.get(`/websites/${id}`);
    return response.data;
  },
  create: async (data: { domain: string; name: string }): Promise<{ website: Website }> => {
    const response = await axiosInstance.post('/websites', data);
    return response.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/websites/${id}`);
    return response.data;
  },
  crawl: async (id: number): Promise<any> => {
    const response = await axiosInstance.post('/analysis/trigger', { websiteId: id });
    return response.data;
  },
  getCrawledPages: async (websiteId: number): Promise<{ pages: CrawledPage[] }> => {
    const response = await axiosInstance.get(`/analysis/${websiteId}/crawled-pages`);
    return response.data;
  },
  getBacklinks: async (websiteId: number): Promise<{ backlinks: Backlink[] }> => {
    const response = await axiosInstance.get(`/websites/${websiteId}/backlinks`);
    return response.data;
  }
};

export const seoApi = {
  triggerDeepAnalysis: async (websiteId: number): Promise<{ message: string }> => {
    const response = await axiosInstance.post(`/seo/deep-analysis/${websiteId}`);
    return response.data;
  }
};

export const analysisApi = {
  trigger: async (data: { websiteId: number; }): Promise<{ message: string; status: string; }> => {
    const response = await axiosInstance.post('/analysis/trigger', data);
    return response.data;
  },
  getLatest: async (websiteId: number): Promise<{ analysis: WebsiteAnalysis }> => {
    const response = await axiosInstance.get(`/analysis/latest/${websiteId}`);
    return response.data;
  },
};

export const articlesApi = {
  getAll: async (): Promise<{ articles: Article[]; total: number }> => {
    const response = await axiosInstance.get('/articles');
    return response.data;
  },
  getById: async (id: number): Promise<{ article: Article }> => {
    const response = await axiosInstance.get(`/articles/${id}`);
    return response.data;
  },
  generate: async (data: any): Promise<{ article: Article }> => {
    const response = await axiosInstance.post('/articles/generate', data);
    return response.data;
  },
  generateBulk: async (data: any): Promise<{ totalGenerated: number }> => {
    const response = await axiosInstance.post('/articles/generate-bulk', data);
    return response.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/articles/${id}`);
    return response.data;
  }
};

export const keywordsApi = {
  getAll: async (): Promise<{ keywords: Keyword[] }> => {
    const response = await axiosInstance.get('/keywords');
    return response.data;
  },
  getByWebsite: async (websiteId: number): Promise<{ keywords: Keyword[] }> => {
    const response = await axiosInstance.get(`/keywords/website/${websiteId}`);
    return response.data;
  },
  update: async (id: number, data: Partial<Keyword>): Promise<{ keyword: Keyword }> => {
    const response = await axiosInstance.put(`/keywords/${id}`, data);
    return response.data;
  },
  create: async (data: Partial<Keyword>): Promise<{ keyword: Keyword }> => {
    const response = await axiosInstance.post('/keywords', data);
    return response.data;
  },
  bulkImport: async (data: { websiteId: number; keywords: string[] }): Promise<{ imported: number, skipped: number }> => {
    const response = await axiosInstance.post('/keywords/bulk-import', data);
    return response.data;
  },
  getAIStatus: async (): Promise<{ providers: any; available: string[]; defaultProvider: string | null }> => {
    const response = await axiosInstance.get('/keywords/ai-status');
    return response.data;
  },
  autoResearch: async (data: any): Promise<any> => {
    const response = await axiosInstance.post('/keywords/auto-research', data);
    return response.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/keywords/${id}`);
    return response.data;
  },
  calculateTrendScore: async (id: number): Promise<{ message: string; aiTrendScore: number; keyword: Keyword }> => {
    const response = await axiosInstance.post(`/keywords/${id}/calculate-trend-score`);
    return response.data;
  }
};


export const googleAnalyticsApi = {
  getStatus: async (): Promise<{ connected: boolean; active: boolean; mappings: any[] }> => {
    const response = await axiosInstance.get(`/google-analytics/status`);
    return response.data;
  },
  connect: async (): Promise<{ authUrl: string }> => {
    const response = await axiosInstance.post(`/google-analytics/connect`);
    return response.data;
  },
  handleCallback: async (code: string, state: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/google-analytics/callback', { code, state });
    return response.data;
  },
  getProperties: async (): Promise<{ properties: any[] }> => {
    const response = await axiosInstance.get(`/google-analytics/properties`);
    return response.data;
  },
  matchProperties: async (data: { matches: { [key: string]: string } }): Promise<{ message: string }> => {
    const response = await axiosInstance.post(`/google-analytics/match-properties`, data);
    return response.data;
  },
  syncData: async (websiteId: number): Promise<{ message: string }> => {
    const response = await axiosInstance.post(`/google-analytics/sync/${websiteId}`);
    return response.data;
  },
  disconnect: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.delete('/google-analytics/disconnect');
    return response.data;
  }
};

export const aiSuggestionsApi = {
  generateSitemap: async (websiteId: number): Promise<string> => {
    const response = await axiosInstance.get(`/ai-suggestions/sitemap/${websiteId}`, {
      responseType: 'text', // Important pentru a primi XML ca text
    });
    return response.data;
  },
  generateSchema: async (pageId: number): Promise<any> => {
    const response = await axiosInstance.get(`/ai-suggestions/schema/${pageId}`);
    return response.data;
  },
};