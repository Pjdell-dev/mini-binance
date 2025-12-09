import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  kyc_status: 'none' | 'pending' | 'approved' | 'rejected';
  mfa_enabled: boolean;
  email_verified_at: string | null;
  is_frozen?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<any>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<any>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password, remember = false) => {
        set({ isLoading: true });
        try {
          // Get CSRF cookie first
          await apiClient.get('/sanctum/csrf-cookie');
          
          const response = await apiClient.post('/auth/login', {
            email,
            password,
            remember,
          });

          if (response.data.user) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
            });
          }

          return response.data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (name, email, password, password_confirmation) => {
        set({ isLoading: true });
        try {
          await apiClient.get('/sanctum/csrf-cookie');
          
          const response = await apiClient.post('/auth/register', {
            name,
            email,
            password,
            password_confirmation,
          });

          set({ isLoading: false });
          return response.data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiClient.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      },

      fetchUser: async () => {
        try {
          const response = await apiClient.get('/me');
          set({
            user: response.data.user,
            isAuthenticated: true,
          });
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      },

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
