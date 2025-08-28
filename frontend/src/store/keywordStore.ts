import { create } from 'zustand';
import { Keyword } from '@/types';
import { keywordsApi } from '@/lib/api';

interface KeywordState {
  keywords: Keyword[];
  isLoading: boolean;
  fetchKeywords: () => Promise<void>;
  createKeyword: (data: Partial<Keyword>) => Promise<void>;
  deleteKeyword: (id: number) => Promise<void>;
  updateKeywordState: (updatedKeyword: Keyword) => void; // Funcție pentru update local
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
      console.error("Failed to fetch keywords:", error);
    }
  },

  createKeyword: async (data) => {
    try {
      const response = await keywordsApi.create(data);
      set(state => ({
        keywords: [response.keyword, ...state.keywords]
      }));
    } catch (error) {
      console.error("Failed to create keyword:", error);
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

  updateKeywordState: (updatedKeyword: Keyword) => {
    set(state => ({
      keywords: state.keywords.map(k => 
        k.id === updatedKeyword.id ? updatedKeyword : k
      )
    }));
  },
}));
