import { create } from 'zustand';
import { Website } from '@/types';
import { websitesApi } from '@/lib/api';

interface WebsiteState {
  websites: Website[];
  currentWebsite: Website | null;
  isLoading: boolean;
  fetchWebsites: () => Promise<void>;
  fetchWebsite: (id: number) => Promise<void>;
  createWebsite: (data: { domain: string; name: string }) => Promise<void>;
  updateWebsite: (id: number, data: { name?: string; domain?: string }) => Promise<void>;
  deleteWebsite: (id: number) => Promise<void>;
  crawlWebsite: (id: number) => Promise<void>;
  setCurrentWebsite: (website: Website | null) => void;
}

export const useWebsiteStore = create<WebsiteState>((set, get) => ({
  websites: [],
  currentWebsite: null,
  isLoading: false,

  fetchWebsites: async () => {
    set({ isLoading: true });
    try {
      const response = await websitesApi.getAll();
      set({ websites: response.websites, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchWebsite: async (id: number) => {
    set({ isLoading: true });
    try {
      const response = await websitesApi.getById(id);
      set({ currentWebsite: response.website, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createWebsite: async (data) => {
    set({ isLoading: true });
    try {
      const response = await websitesApi.create(data);
      const { websites } = get();
      set({ 
        websites: [response.website, ...websites],
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateWebsite: async (id, data) => {
    set({ isLoading: true });
    try {
      const response = await websitesApi.update(id, data);
      const { websites, currentWebsite } = get();
      
      const updatedWebsites = websites.map(w => 
        w.id === id ? response.website : w
      );
      
      set({ 
        websites: updatedWebsites,
        currentWebsite: currentWebsite?.id === id ? response.website : currentWebsite,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteWebsite: async (id) => {
    set({ isLoading: true });
    try {
      await websitesApi.delete(id);
      const { websites, currentWebsite } = get();
      
      set({ 
        websites: websites.filter(w => w.id !== id),
        currentWebsite: currentWebsite?.id === id ? null : currentWebsite,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  crawlWebsite: async (id) => {
    try {
      await websitesApi.crawl(id);
      // Update the website status to 'pending'
      const { websites } = get();
      const updatedWebsites = websites.map(w => 
        w.id === id ? { ...w, crawlStatus: 'pending' as const } : w
      );
      set({ websites: updatedWebsites });
    } catch (error) {
      throw error;
    }
  },

  setCurrentWebsite: (website) => {
    set({ currentWebsite: website });
  },
}));