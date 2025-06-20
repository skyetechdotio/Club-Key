import { createContext, useEffect, useState, ReactNode, useContext, useCallback } from "react";
import { useLocation } from "wouter";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import type { User as SupabaseUser } from '@supabase/supabase-js';

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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ user: any; emailVerificationPending: boolean; email: string }>;
  logout: () => Promise<void>;
  openAuthModal: (view?: "login" | "register" | "reset-password") => void;
  refreshUserData: () => Promise<any>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateUser: (newUser: User) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => ({ user: null, emailVerificationPending: false, email: "" }),
  logout: async () => {},
  openAuthModal: () => {},
  refreshUserData: async () => {},
  requestPasswordReset: async () => {},
  updatePassword: async () => {},
  updateUser: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
  openAuthModal: (view?: "login" | "register" | "reset-password") => void;
}

export function AuthProvider({ children, openAuthModal }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Helper function to merge Supabase user with profile data
  const mergeUserWithProfile = async (supabaseUser: SupabaseUser): Promise<User> => {
    try {
      // Create timeout promise (5 seconds) to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile query timeout after 5 seconds')), 5000);
      });
      
      // Create profile query promise
      const profileQuery = supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();
      
      // Race between query and timeout
      const result = await Promise.race([profileQuery, timeoutPromise]);
      const { data: profile, error } = result as any;

      if (error) {
        console.warn('Profile fetch failed, using basic user info:', error.message);
        return {
          ...supabaseUser,
          isHost: false,
          onboardingCompleted: false,
          firstName: supabaseUser.user_metadata?.firstName || 'User',
          lastName: supabaseUser.user_metadata?.lastName || '',
        } as User;
      }

      console.log('🔍 [mergeUserWithProfile] Raw profile data from database:', profile);
      console.log('🔍 [mergeUserWithProfile] Raw onboarding_completed value:', profile.onboarding_completed);
      console.log('🔍 [mergeUserWithProfile] Type of onboarding_completed:', typeof profile.onboarding_completed);

      // Merge Supabase user data with profile data
      const mergedUser = {
        ...supabaseUser,
        firstName: profile.first_name || supabaseUser.user_metadata?.firstName || 'User',
        lastName: profile.last_name || supabaseUser.user_metadata?.lastName || '',
        bio: profile.bio,
        profileImage: profile.profile_image,
        isHost: profile.is_host || false,
        onboardingCompleted: profile.onboarding_completed === true, // Explicit true check
        username: profile.username,
      } as User;
      
      console.log('🔍 [mergeUserWithProfile] Final merged user onboardingCompleted:', mergedUser.onboardingCompleted);
      return mergedUser;
    } catch (error) {
      console.warn('Profile merge failed, using fallback user info:', error);
      return {
        ...supabaseUser,
        isHost: false,
        onboardingCompleted: false,
        firstName: supabaseUser.user_metadata?.firstName || 'User',
        lastName: supabaseUser.user_metadata?.lastName || '',
      } as User;
    }
  };

  const refreshUserData = useCallback(async () => {
    try {
      console.log("Refreshing user data from Supabase");
      
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error("Error getting current user:", error);
        return null;
      }
      
      if (currentUser) {
        const mergedUser = await mergeUserWithProfile(currentUser);
        setUser(mergedUser);
        
        // Invalidate related queries to ensure consistent data across components
        queryClient.invalidateQueries({ queryKey: ["supabase:profiles:single"] });
        queryClient.invalidateQueries({ queryKey: [`supabase:profiles:single`, { id: currentUser.id }] });
        queryClient.invalidateQueries({ queryKey: [`supabase:hosts:select`] });
        queryClient.invalidateQueries({ queryKey: [`supabase:clubs:select`] });
        
        console.log("User data refreshed successfully", mergedUser);
        console.log("🔍 [refreshUserData] About to return mergedUser with onboardingCompleted:", mergedUser.onboardingCompleted);
        return mergedUser;
      }
      
      return null;
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      toast({
        title: "Refresh Error",
        description: "Failed to refresh user data",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Set up auth state change listener
  useEffect(() => {
    // First, check for existing session immediately
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          const mergedUser = await mergeUserWithProfile(session.user);
          setUser(mergedUser);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error in initial session check:', error);
        setIsLoading(false);
      }
    };

    // Check for existing session first
    checkInitialSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        try {
          if (session?.user) {
            // User is signed in, fetch and merge profile data
            const mergedUser = await mergeUserWithProfile(session.user);
            setUser(mergedUser);
          } else {
            // User is signed out
            setUser(null);
          }
        } catch (error) {
          console.error('Error in auth state change handler:', error);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Set up periodic user data refresh for authenticated users
  useEffect(() => {
    if (user) {
      // Set up a periodic refresh every 60 seconds to ensure data consistency
      const refreshInterval = setInterval(() => {
        refreshUserData();
      }, 60000);
      
      // Clean up interval on component unmount or user logout
      return () => clearInterval(refreshInterval);
    }
  }, [user?.id, refreshUserData]);

  const login = async (email: string, password: string) => {
    try {
      console.log("Attempting login with email:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        throw new Error(error.message);
      }

      if (data.user) {
        const mergedUser = await mergeUserWithProfile(data.user);
        setUser(mergedUser);
        queryClient.invalidateQueries();
        console.log("Login successful, user data:", mergedUser);
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      toast({
        title: "Login Failed",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            is_host: data.isHost || false,
            username: data.username || null, // Explicitly set to null if not provided
          },
        },
      });

      if (error) {
        console.error("Registration error:", error);
        throw new Error(error.message);
      }

      if (authData.user) {
        console.log("Registration successful");
        
        // Check if email verification is pending (session is null) or user is immediately signed in
        if (authData.session) {
          // User is immediately signed in
          const mergedUser = await mergeUserWithProfile(authData.user);
          setUser(mergedUser);
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
      
      // Fallback return (shouldn't reach here)
      return { 
        user: null, 
        emailVerificationPending: true, 
        email: data.email 
      };
    } catch (error: any) {
      console.error("Registration failed:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error:", error);
        throw new Error(error.message);
      }
      
      setUser(null);
      queryClient.clear();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if the API call fails, clear user state on the client side
      setUser(null);
      queryClient.clear();
      navigate("/");
      
      toast({
        title: "Logout Error",
        description: "There was an issue logging out, but you have been logged out locally.",
        variant: "destructive",
      });
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        console.error("Password reset request error:", error);
        throw new Error(error.message);
      }

      toast({
        title: "Password Reset Sent",
        description: "Check your email for password reset instructions",
      });
    } catch (error: any) {
      console.error("Password reset request failed:", error);
      toast({
        title: "Password Reset Failed",
        description: error.message || "Failed to send password reset email",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("Password update error:", error);
        throw new Error(error.message);
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated",
      });
    } catch (error: any) {
      console.error("Password update failed:", error);
      toast({
        title: "Password Update Failed",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateUser = (newUser: User) => {
    console.log("🔄 [updateUser] Manually updating auth context with user:", newUser);
    setUser(newUser);
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    openAuthModal,
    refreshUserData,
    requestPasswordReset,
    updatePassword,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function ThemeProvider({ children, ...props }: any) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
