import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios, { AxiosError } from 'axios';

export enum Role {
  Tourist = 'tourist',
  Officer = 'officer',
  Admin = 'admin'
}


export const BackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:2000';

// Helper function to set cookie with proper settings for dev/prod
const setAuthCookie = (token: string, maxAge: number = 7 * 24 * 60 * 60) => {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    document.cookie = `token=${token}; path=/; secure; samesite=none; max-age=${maxAge}`;
  } else {
    document.cookie = `token=${token}; path=/; max-age=${maxAge}`;
  }
};

// Helper function to clear cookie
const clearAuthCookie = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    document.cookie = `token=; path=/; secure; samesite=none; max-age=0`;
  } else {
    document.cookie = `token=; path=/; max-age=0`;
  }
};

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
  role: Role | string;
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
  login: (email: string, password: string) => Promise<string>;
  googleLogin: (googleData: { email: string; name: string; picture: string; googleId: string }) => Promise<string>;
  register: (data: {
    fullname: { firstname: string; lastname: string };
    email: string;
    password: string;
    username: string;
  }) => Promise<string>;
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
  getRedirectPath: (user?: User | null) => string;
  profileBox: string;
  setProfileBox: (modalName: string) => void;

}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      token: null,
      user: null,
      loading: true, // Start with loading true to prevent premature redirects
      error: null,
      notifications: [],
      unreadNotificationCount: 0,

      setIsAuthenticated: (value) => set({ isAuthenticated: value }),

      login: async (email: string, password: string) => {
        set({ loading: true, error: null });
        try {
          const response = await api.post('/login', { email, password });
          const { token, user } = response.data;
          setAuthCookie(token);
          set({ token, user, isAuthenticated: true, loading: false });
          
          // Return redirect path based on user role
          const userRole = user?.role?.toLowerCase();
          if (userRole === 'officer' || userRole === 'police' || userRole === 'admin') {
            return '/dashboard';
          } else if (userRole === 'tourist' || userRole === 'traveller') {
            return '/user';
          }
          return '/';
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
          setAuthCookie(token);

          set({ token, user, isAuthenticated: true, loading: false });
          
          // Return redirect path based on user role
          const userRole = user?.role?.toLowerCase();
          if (userRole === 'officer' || userRole === 'police' || userRole === 'admin') {
            return '/dashboard';
          } else if (userRole === 'tourist' || userRole === 'traveller') {
            return '/user';
          }
          return '/';
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
          setAuthCookie(token, 7 * 24 * 60 * 60 * 365 * 5); // 5 years
          set({ token, user, isAuthenticated: true, loading: false });
          
          // Return redirect path based on user role
          const userRole = user?.role?.toLowerCase();
          if (userRole === 'officer' || userRole === 'police' || userRole === 'admin') {
            return '/dashboard';
          } else if (userRole === 'tourist' || userRole === 'traveller') {
            return '/user';
          }
          return '/';
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
          clearAuthCookie();
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
        // Check both localStorage and cookies for token
        const storedAuth = JSON.parse(localStorage.getItem('safarshield-auth') || '{}');
        const token = storedAuth?.state?.token;
        
        // Also check cookies as fallback
        const cookieToken = typeof document !== 'undefined' 
          ? document.cookie
              .split('; ')
              .find(row => row.startsWith('token='))
              ?.split('=')[1]
          : null;
        
        const authToken = token || cookieToken;
        
        if (!authToken) {
          set({ isAuthenticated: false, user: null, token: null, loading: false });
          return;
        }

        try {
          set({ loading: true, error: null });
          // Use the correct verify-token endpoint from /api/auth/verify-token
          const response = await axios.get(`${BackendUrl}/api/auth/verify-token`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            withCredentials: true,
          });
          
          const user = response.data.user;
          set({ 
            user, 
            token: authToken,
            isAuthenticated: true, 
            loading: false 
          });
          
          // Ensure cookie is set if we only had localStorage token
          if (token && !cookieToken && typeof document !== 'undefined') {
            setAuthCookie(token);
          }
        } catch (error) {
          console.error('Error verifying user:', error);
          localStorage.removeItem('safarshield-auth');
          if (typeof document !== 'undefined') {
            clearAuthCookie();
          }
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
          return true;
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

      getRedirectPath: (user?: User | null) => {
        const state = get();
        const userToCheck = user || state.user;
        if (!userToCheck || !state.isAuthenticated) {
          return '/';
        }
        
        const userRole = String(userToCheck.role).toLowerCase();
        if (userRole === 'officer' || userRole === 'police' || userRole === 'admin') {
          return '/dashboard';
        } else if (userRole === 'tourist' || userRole === 'traveller') {
          return '/user';
        }
        return '/';
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