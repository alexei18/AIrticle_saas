import { create } from 'zustand';
import { Keyword } from '@/types';
import { keywordsApi } from '@/lib/api';

interface KeywordState {
  keywords: Keyword[];
  isLoading: boolean;
  fetchKeywords: () => Promise<void>;
  fetchKeywordsByWebsite: (websiteId: number) => Promise<void>;
  createKeyword: (data: {
    websiteId: number;
    keyword: string;
    searchVolume?: number;
    difficultyScore?: number;
    intentType?: string;
  }) => Promise<void>;
  updateKeyword: (id: number, data: {
    searchVolume?: number;
    difficultyScore?: number;
    currentPosition?: number;
    intentType?: string;
    isTracking?: boolean;
  }) => Promise<void>;
  deleteKeyword: (id: number) => Promise<void>;
  bulkImportKeywords: (data: {
    websiteId: number;
    keywords: string[];
  }) => Promise<void>;
}

export const useKeywordStore = create<KeywordState>((set, get) => ({
  keywords: [],
  isLoading: false,

  fetchKeywords: async () => {
    set({ isLoading: true });
    try {
      const response = await keywordsApi.getAll();
      set({ keywords: response.keywords, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchKeywordsByWebsite: async (websiteId: number) => {
    set({ isLoading: true });
    try {
      const response = await keywordsApi.getByWebsite(websiteId);
      set({ keywords: response.keywords, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createKeyword: async (data) => {
    set({ isLoading: true });
    try {
      const response = await keywordsApi.create(data);
      const { keywords } = get();
      set({ 
        keywords: [response.keyword, ...keywords],
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateKeyword: async (id, data) => {
    set({ isLoading: true });
    try {
      const response = await keywordsApi.update(id, data);
      const { keywords } = get();
      
      const updatedKeywords = keywords.map(k => 
        k.id === id ? response.keyword : k
      );
      
      set({ 
        keywords: updatedKeywords,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteKeyword: async (id: number) => {
    try {
      await keywordsApi.delete(id);
      set(state => ({
        keywords: state.keywords.filter(k => k.id !== id)
      }));
    } catch (error) {
      console.error("Failed to delete keyword:", error);
      throw error;
    }
  },

  bulkImportKeywords: async (data) => {
    try {
      const response = await keywordsApi.bulkImport(data);
      const { keywords } = get();
      
      set({ 
        keywords: [...response.keywords, ...keywords]
      });
    } catch (error) {
      throw error;
    }
  },
}));