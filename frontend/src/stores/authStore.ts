import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Toast function type - will be injected from components
type ToastFunction = (props: {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

// Global toast function - will be set by components that have access to useToast
let globalToast: ToastFunction | null = null;

export const setGlobalToast = (toastFn: ToastFunction) => {
  globalToast = toastFn;
};

// Extended User interface that includes both Supabase auth user and profile data
export interface User extends SupabaseUser {
  firstName?: string;
  lastName?: string;
  bio?: string;
  profileImage?: string;
  isHost: boolean;
  onboardingCompleted?: boolean;
  username?: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  isHost?: boolean;
  username?: string;
}

interface AuthState {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Modal State
  isAuthModalOpen: boolean;
  authModalView: "login" | "register" | "reset-password";
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ user: any; emailVerificationPending: boolean; email: string }>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<User | null>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  
  // Modal Actions
  openAuthModal: (view?: "login" | "register" | "reset-password") => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: "login" | "register" | "reset-password") => void;
}

// Helper function to merge Supabase user with profile data
const mergeUserWithProfile = async (supabaseUser: SupabaseUser): Promise<User> => {
  try {
    console.log('🔍 [authStore] mergeUserWithProfile called for user:', supabaseUser.id);
    
    // Try to get profile data with timeout and limited retries
    let profile = null;
    const maxAttempts = 1; // Reduce retry attempts to avoid cascading timeouts
    
    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
      console.log(`🔍 [authStore] Profile fetch attempt ${attempts}/${maxAttempts}`);
      
      try {
        // Create a promise with timeout for each attempt
        const fetchPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();
          
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
        );
        
        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (error) {
          console.warn(`🔍 [authStore] Profile fetch attempt ${attempts} failed:`, error.message);
          if (attempts === maxAttempts) {
            throw error;
          }
          // Short wait before retrying (if we had multiple attempts)
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        profile = data;
        console.log(`🔍 [authStore] Profile fetch successful on attempt ${attempts}`);
        break;
      } catch (fetchError) {
        console.warn(`🔍 [authStore] Profile fetch attempt ${attempts} error:`, fetchError);
        if (attempts === maxAttempts) {
          throw fetchError;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!profile) {
      console.warn('🔍 [authStore] No profile found after retries, using enhanced fallback with auth metadata');
      return {
        ...supabaseUser,
        isHost: false,
        // Use true as fallback for onboarding to prevent redirect loops
        onboardingCompleted: true, 
        firstName: supabaseUser.user_metadata?.firstName || supabaseUser.user_metadata?.first_name || 'User',
        lastName: supabaseUser.user_metadata?.lastName || supabaseUser.user_metadata?.last_name || '',
        username: supabaseUser.user_metadata?.username || `user_${supabaseUser.id.slice(0, 8)}`,
        bio: supabaseUser.user_metadata?.bio || null,
        profileImage: supabaseUser.user_metadata?.profileImage || null,
      } as User;
    }

    console.log('🔍 [authStore] Raw profile data from database:', profile);
    console.log('🔍 [authStore] Raw onboarding_completed value:', profile.onboarding_completed);
    console.log('🔍 [authStore] Type of onboarding_completed:', typeof profile.onboarding_completed);

    // Merge Supabase user data with profile data
    const mergedUser = {
      ...supabaseUser,
      firstName: profile.first_name || supabaseUser.user_metadata?.firstName || 'User',
      lastName: profile.last_name || supabaseUser.user_metadata?.lastName || '',
      bio: profile.bio,
      profileImage: profile.profile_image_url,
      isHost: profile.is_host || false,
      onboardingCompleted: profile.onboarding_completed === true, // Explicit true check
      username: profile.username,
    } as User;
    
    console.log('🔍 [authStore] Final merged user onboardingCompleted:', mergedUser.onboardingCompleted);
    return mergedUser;
  } catch (error) {
    console.warn('🔍 [authStore] Profile merge failed, using enhanced fallback user info:', error);
    return {
      ...supabaseUser,
      isHost: false,
      // Use true as fallback for onboarding to prevent redirect loops for existing users
      onboardingCompleted: true,
      firstName: supabaseUser.user_metadata?.firstName || supabaseUser.user_metadata?.first_name || 'User',
      lastName: supabaseUser.user_metadata?.lastName || supabaseUser.user_metadata?.last_name || '',
      username: supabaseUser.user_metadata?.username || `user_${supabaseUser.id.slice(0, 8)}`,
      bio: supabaseUser.user_metadata?.bio || null,
      profileImage: supabaseUser.user_metadata?.profileImage || null,
    } as User;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isLoading: true,
  isAuthenticated: false,
  
  // Modal state
  isAuthModalOpen: false,
  authModalView: "login",

  // Actions
  setUser: (user) => {
    console.log('🔍 [authStore] setUser called with:', user);
    set({ 
      user, 
      isAuthenticated: !!user,
      isLoading: false 
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  refreshUserData: async () => {
    try {
      console.log('🔍 [authStore] refreshUserData called');
      
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('🔍 [authStore] Error getting current user:', error);
        return null;
      }
      
      if (currentUser) {
        const mergedUser = await mergeUserWithProfile(currentUser);
        
        // Update store with merged user
        get().setUser(mergedUser);
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ["supabase:profiles:single"] });
        queryClient.invalidateQueries({ queryKey: [`supabase:profiles:single`, { id: currentUser.id }] });
        queryClient.invalidateQueries({ queryKey: [`supabase:hosts:select`] });
        queryClient.invalidateQueries({ queryKey: [`supabase:clubs:select`] });
        
        console.log('🔍 [authStore] refreshUserData completed, returning:', mergedUser);
        return mergedUser;
      }
      
      get().setUser(null);
      return null;
    } catch (error) {
      console.error('🔍 [authStore] Failed to refresh user data:', error);
      return null;
    }
  },

  login: async (email, password) => {
    try {
      console.log('🔍 [authStore] Login attempt for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('🔍 [authStore] Login error:', error);
        if (globalToast) {
          globalToast({
            title: "Login Failed",
            description: error.message || "An error occurred during login",
            variant: "destructive",
          });
        }
        throw new Error(error.message);
      }

      if (data.user) {
        const mergedUser = await mergeUserWithProfile(data.user);
        get().setUser(mergedUser);
        queryClient.invalidateQueries();
        console.log('🔍 [authStore] Login successful');
      }
    } catch (error: any) {
      console.error('🔍 [authStore] Login failed:', error);
      throw error;
    }
  },

  register: async (data) => {
    try {
      console.log('🔍 [authStore] Registration attempt for:', data.email);
      
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            is_host: data.isHost || false,
            username: data.username || null,
          },
        },
      });

      if (error) {
        console.error('🔍 [authStore] Registration error:', error);
        throw new Error(error.message);
      }

      if (authData.user) {
        console.log('🔍 [authStore] Registration successful');
        
        // Check if email verification is pending or user is immediately signed in
        if (authData.session) {
          // User is immediately signed in
          const mergedUser = await mergeUserWithProfile(authData.user);
          get().setUser(mergedUser);
          return { 
            user: mergedUser, 
            emailVerificationPending: false, 
            email: data.email 
          };
        } else {
          // Email verification is pending
          return { 
            user: authData.user, 
            emailVerificationPending: true, 
            email: data.email 
          };
        }
      }
      
      return { 
        user: null, 
        emailVerificationPending: true, 
        email: data.email 
      };
    } catch (error: any) {
      console.error('🔍 [authStore] Registration failed:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      console.log('🔍 [authStore] Logout attempt');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('🔍 [authStore] Logout error:', error);
        throw new Error(error.message);
      }
      
      get().setUser(null);
      queryClient.clear();
      console.log('🔍 [authStore] Logout successful');
      
      // Redirect to home page after successful logout
      window.location.href = '/';
    } catch (error) {
      console.error('🔍 [authStore] Logout failed:', error);
      // Even if API call fails, clear user state locally
      get().setUser(null);
      queryClient.clear();
      // Still redirect to home page
      window.location.href = '/';
      throw error;
    }
  },

  requestPasswordReset: async (email) => {
    try {
      console.log('🔍 [authStore] Password reset request for:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        console.error('🔍 [authStore] Password reset error:', error);
        throw new Error(error.message);
      }

      console.log('🔍 [authStore] Password reset email sent');
    } catch (error: any) {
      console.error('🔍 [authStore] Password reset failed:', error);
      throw error;
    }
  },

  updatePassword: async (newPassword) => {
    try {
      console.log('🔍 [authStore] Password update attempt');
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('🔍 [authStore] Password update error:', error);
        throw new Error(error.message);
      }

      console.log('🔍 [authStore] Password updated successfully');
    } catch (error: any) {
      console.error('🔍 [authStore] Password update failed:', error);
      throw error;
    }
  },

  // Modal Actions
  openAuthModal: (view = "login") => {
    console.log('🔍 [authStore] Opening auth modal with view:', view);
    set({ isAuthModalOpen: true, authModalView: view });
  },

  closeAuthModal: () => {
    console.log('🔍 [authStore] Closing auth modal');
    set({ isAuthModalOpen: false });
  },

  setAuthModalView: (view) => {
    console.log('🔍 [authStore] Setting auth modal view to:', view);
    set({ authModalView: view });
  },
}));

// Initialize auth state - this should be called once in App.tsx
export const initializeAuth = async () => {
  console.log('🔍 [authStore] Initializing auth...');
  
  const store = useAuthStore.getState();
  
  try {
    // Check for existing session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('🔍 [authStore] Error getting initial session:', error);
      store.setLoading(false);
      return;
    }

    if (session?.user) {
      console.log('🔍 [authStore] Found existing session');
      const mergedUser = await mergeUserWithProfile(session.user);
      store.setUser(mergedUser);
    } else {
      console.log('🔍 [authStore] No existing session');
      store.setUser(null);
    }
  } catch (error) {
    console.error('🔍 [authStore] Error in initial session check:', error);
    store.setLoading(false);
  }
  
  // Set up auth state change listener
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔍 [authStore] Auth state changed:', event);
    
    try {
      if (session?.user) {
        // User is signed in, fetch and merge profile data
        const mergedUser = await mergeUserWithProfile(session.user);
        store.setUser(mergedUser);
      } else {
        // User is signed out
        store.setUser(null);
      }
    } catch (error) {
      console.error('🔍 [authStore] Error in auth state change handler:', error);
    }
  });
  
  console.log('🔍 [authStore] Auth initialization complete');
};