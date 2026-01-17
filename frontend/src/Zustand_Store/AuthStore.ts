import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios, { AxiosError } from 'axios';

export enum Role {
  Tourist = 'tourist',
  Officer = 'officer'
}


export const BackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:2000';

const api = axios.create({
  baseURL: `${BackendUrl}/api/users`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = JSON.parse(localStorage.getItem('safarshield-auth') || '{}').state?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  _id: string;
  username: string;
  fullname: {
    firstname: string;
    lastname: string;
  };
  email: string;
  role: Role;
  avatar?: string;
  bio?: string;

  // SafarShield specific fields
  consentGiven?: boolean;
  consentDate?: Date;
  isVerified: boolean;

  // Emergency contacts for tourist safety
  emergencyContacts?: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }>;

  // Police officer specific fields
  badgeNumber?: string;
  department?: string;
  jurisdiction?: string;

  // Socket.io for real-time communication
  socketId?: string;

  // Google OAuth
  googleId?: string;

  // Audit trail
  lastLoginAt?: Date;
  isActive?: boolean;

  // Notifications
  notifications?: Array<{
    type: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
    alertId?: string;
  }>;

  createdAt?: Date;
  updatedAt?: Date;
}

interface Notification {
  _id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  senderId?: {
    _id: string;
    fullname: { firstname: string; lastname: string };
    avatar?: string;
    username?: string;
  };
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  setIsAuthenticated: (value: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (googleData: { email: string; name: string; picture: string; googleId: string }) => Promise<void>;
  register: (data: {
    fullname: { firstname: string; lastname: string };
    email: string;
    password: string;
    username: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => boolean;
  verifyUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateAvatar: (file: File) => Promise<void>;
  updateBanner: (file: File) => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<{ result: string; _id: string; role: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  getUserProfileByUsername: (username: string) => Promise<User>;
  updateSocketId: (socketId: string, userId: string) => Promise<void>;
  getUserBySocketId: (socketId: string) => Promise<User>;
  profileBox: string;
  setProfileBox: (modalName: string) => void;

}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      user: null,
      loading: false,
      error: null,
      notifications: [],
      unreadNotificationCount: 0,

      setIsAuthenticated: (value) => set({ isAuthenticated: value }),

      login: async (email: string, password: string) => {
        set({ loading: true, error: null });
        try {
          const response = await api.post('/login', { email, password });
          const { token, user } = response.data;
          document.cookie = `token=${token}; path=/; secure; samesite=none; max-age=${7 * 24 * 60 * 60}`; // 7 days
          set({ token, user, isAuthenticated: true, loading: false });
        } catch (error: unknown) {
          console.error('Login failed:', error);
          set({
            error: error instanceof AxiosError ? error.response?.data?.message : 'Failed to login',
            loading: false
          });
          throw error;
        }
      },

      googleLogin: async (googleData) => {
        set({ loading: true, error: null });
        try {
          const response = await api.post('/google-login', googleData);
          console.log("google login response", response.data);
          const { token, user } = response.data;
          document.cookie = `token=${token}; path=/; secure; samesite=none; max-age=${7 * 24 * 60 * 60}`; // 7 days

          set({ token, user, isAuthenticated: true, loading: false });
        } catch (error: unknown) {
          console.error('Google login failed:', error);
          set({
            error: error instanceof AxiosError ? error.response?.data?.message : 'Failed to login with Google',
            loading: false
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ loading: true, error: null });
        try {
          const response = await api.post('/register', data);
          const { token, user } = response.data;
          document.cookie = `token=${token}; path=/; secure; samesite=none; max-age=${7 * 24 * 60 * 60 * 1000 * 365 * 5}`; // 7 days
          set({ token, user, isAuthenticated: true, loading: false });
        } catch (error: unknown) {
          console.error('Registration failed:', error);
          set({
            error: error instanceof AxiosError ? error.response?.data?.message : 'Failed to register',
            loading: false
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post('/logout');
        } catch (error) {
          console.error('Logout failed:', error);
        } finally {
          document.cookie = `token=; path=/; secure; samesite=none; max-age=0`;
          localStorage.removeItem('safarshield-auth');
          set({ token: null, isAuthenticated: false, user: null, error: null });
        }
      },

      checkAuth: () => {
        const token = JSON.parse(localStorage.getItem('safarshield-auth') || '{}').state?.token;
        const isAuth = !!token;
        set({ isAuthenticated: isAuth, token });
        return isAuth;
      },

      verifyUser: async () => {
        const token = JSON.parse(localStorage.getItem('safarshield-auth') || '{}').state?.token;
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        try {
          set({ loading: true, error: null });
          const response = await api.get('/me');
          set({ user: response.data.user, loading: false });
        } catch (error) {
          console.error('Error verifying user:', error);
          localStorage.removeItem('safarshield-auth');
          document.cookie = `token=; path=/; secure; samesite=none; max-age=0`;
          set({
            isAuthenticated: false,
            token: null,
            user: null,
            error: 'Session expired',
            loading: false
          });
        }
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null
        }));
      },

      updateProfile: async (data) => {
        try {
          set({ loading: true, error: null });
          const response = await api.put('/update', data);
          console.log(response.data);
          set({ user: response.data.user, loading: false });
        } catch (error: unknown) {
          console.error('Error updating profile:', error);
          set({
            error: error instanceof AxiosError ? error.response?.data?.message : 'Failed to update profile',
            loading: false
          });
          throw error;
        }
      },

      checkUsernameAvailability: async (username: string) => {
        try {
          const response = await api.get(`/check-username/${username}`);
          return response.data.available;
        } catch (error) {
          console.error('Error checking username:', error);
          return false;
        }
      },

      updateAvatar: async (file: File) => {
        try {
          set({ loading: true, error: null });
          const formData = new FormData();
          formData.append('avatar', file);

          const response = await api.post('/avatar', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          if (response.data.avatar) {
            set((state) => ({
              user: state.user ? { ...state.user, avatar: response.data.avatar } : null,
              loading: false
            }));
          } else {
            throw new Error('No avatar URL in response');
          }
        } catch (error: unknown) {
          console.error('Error updating avatar:', error);
          set({
            error: error instanceof AxiosError ? error.response?.data?.message : 'Failed to update avatar',
            loading: false
          });
          throw error;
        }
      },

      updateBanner: async (file: File) => {
        try {
          set({ loading: true, error: null });
          const formData = new FormData();
          formData.append('banner', file);

          const response = await api.post('/banner', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          if (response.data.banner) {
            set((state) => ({
              user: state.user ? { ...state.user, banner: response.data.banner } : null,
              loading: false
            }));
          } else {
            throw new Error('No banner URL in response');
          }
        } catch (error: unknown) {
          console.error('Error updating banner:', error);
          set({
            error: error instanceof AxiosError ? error.response?.data?.message : 'Failed to update banner',
            loading: false
          });
          throw error;
        }
      },

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      sendOTP: async (email: string) => {
        set({ loading: true, error: null });
        try {
          await api.post('/send-otp', { email });
        } catch (error: unknown) {
          set({
            error: error instanceof AxiosError ? error.response?.data?.message : 'Failed to send OTP',
            loading: false
          });
          throw error;
        }
      },

      verifyOTP: async (email: string, otp: string) => {
        set({ loading: true, error: null });
        try {
          const response = await api.post('/verify-otp', { email, otp });
          console.log(response.data);
          return response.data;
        } catch (error: unknown) {
          set({
            error: error instanceof AxiosError ? error.response?.data?.message : 'Failed to verify OTP',
            loading: false
          });
          throw error;
        }
      },

      resetPassword: async (email: string, otp: string, newPassword: string) => {
        set({ loading: true, error: null });
        try {
          await api.post('/reset-password', { email, otp, newPassword });
        } catch (error: unknown) {
          set({
            error: error instanceof AxiosError ? error.response?.data?.message : 'Failed to reset password',
            loading: false
          });
          throw error;
        }
      },

      getUserProfileByUsername: async (username: string) => {
        try {
          const response = await api.get(`/profile/${username}`);
          return response.data.user;
        } catch (error: unknown) {
          console.error('Error getting user profile:', error);
          throw error;
        }
      },

      updateSocketId: async (socketId: string, userId: string) => {
        try {
          const response = await api.post('/update-socket-id', { socketId, userId });
          return response.data;
        } catch (error: unknown) {
          console.error('Error updating socket ID:', error);
          throw error;
        }
      },

      getUserBySocketId: async (socketId: string) => {
        try {
          const response = await api.get(`/get-user-by-socket-id/${socketId}`);
          return response.data.user;
        } catch (error: unknown) {
          console.error('Error getting user by socket ID:', error);
          throw error;
        }
      },

      profileBox: "close",
      setProfileBox: (modalName) => set({ profileBox: modalName }),

    }),
    {
      name: 'safarshield-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        token: state.token,
        user: state.user
      })
    }
  )
);

export default useAuthStore; 