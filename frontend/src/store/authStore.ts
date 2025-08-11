import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    planType?: string;
  }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }) => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(email, password);
          const { user, token } = response;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          localStorage.setItem('token', token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register(data);
          const { user, token } = response;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          localStorage.setItem('token', token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      },

      updateProfile: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.updateProfile(data);
          set({
            user: response.user,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      checkAuth: async () => {
        console.log('🔐 AuthStore: Checking authentication...');
        const token = localStorage.getItem('token');
        console.log('🔐 AuthStore: Token from localStorage:', token ? 'Present' : 'Missing');
        
        if (!token) {
          console.log('🔐 AuthStore: No token found, setting unauthenticated');
          set({ isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          console.log('🔐 AuthStore: Verifying token with API...');
          const response = await authApi.verifyToken();
          console.log('✅ AuthStore: Token verified successfully', response.user?.email);
          set({
            user: response.user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('❌ AuthStore: Token verification failed:', error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);