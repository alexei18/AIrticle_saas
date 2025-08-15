export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  planType: 'starter' | 'professional' | 'enterprise';
  createdAt: string;
}

export interface Website {
  id: number;
  userId: number;
  domain: string;
  name: string;
  lastCrawledAt: string | null;
  crawlStatus: 'pending' | 'crawling' | 'completed' | 'failed';
  stats?: {
    totalKeywords: number;
    trackingKeywords: number;
    totalArticles: number;
    publishedArticles: number;
  };
}

export interface Keyword {
  id: number;
  websiteId: number;
  keyword: string;
  searchVolume: number | null;
  difficultyScore: number | null;
  currentPosition: number | null;
  website?: {
    id: number;
    name: string;
  };
}

export interface Article {
  id: number;
  websiteId: number;
  userId: number;
  title: string;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  targetKeywords: string[];
  wordCount: number;
  seoScore: number | null;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  website?: {
    id: number;
    name: string;
  };
}

// NOU: Definiția pentru o pagină individuală analizată
export interface CrawledPage {
  id: number;
  websiteId: number;
  url: string;
  title: string;
  seoScore: number | null;
  issues: string[];
  suggestions: string[]; // Adăugat
  aiRecommendations: string[];
}

// Definiție standard pentru un raport de analiză
export interface AnalysisReport {
  score: number;
  issues: string[];
  metrics: { [key: string]: any };
  error?: string;
}

// NOU: Definiție standard pentru o recomandare
export interface Recommendation {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  type: string;
}

// ACTUALIZAT: Definiția pentru analiza completă a unui website
export interface WebsiteAnalysis {
  id: number;
  websiteId: number;
  overallScore: number;
  technicalReport: AnalysisReport | null;
  contentReport: AnalysisReport | null;
  seoReport: AnalysisReport | null;
  semrushReport: {
    score: number;
    error?: string;
    data?: any; // Aici poți detalia mai mult dacă vrei
    recommendations?: Recommendation[];
  } | null;
  recommendations: Recommendation[];
  createdAt: string;
}
