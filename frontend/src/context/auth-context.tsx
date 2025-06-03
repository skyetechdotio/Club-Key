import { createContext, useEffect, useState, ReactNode, useContext } from "react";
import { apiRequest } from "@/lib/queryClient";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { queryClient } from "@/lib/queryClient";

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  profileImage?: string;
  isHost: boolean;
  createdAt: string;
  onboardingCompleted?: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  isHost?: boolean;
  username?: string; // Made optional
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<any>; // Changed to return any for user data
  logout: () => Promise<void>;
  openAuthModal: (view?: "login" | "register" | "reset-password") => void;
  refreshUserData: () => Promise<any>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  openAuthModal: () => {},
  refreshUserData: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
  openAuthModal: (view?: "login" | "register" | "reset-password") => void;
}

export function AuthProvider({ children, openAuthModal }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/auth/user", {
          credentials: "include",
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to load user:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log("Attempting login with email:", email);
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Login response not OK:", response.status, errorData);
        throw new Error(errorData.message || "Authentication failed");
      }
      
      const userData = await response.json();
      console.log("Login successful, user data:", userData);
      setUser(userData);
      queryClient.invalidateQueries();
    } catch (error: any) {
      console.error("Login failed:", error);
      throw new Error(error.message || "Login failed");
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await apiRequest("POST", "/api/register", data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }
      
      const userData = await response.json();
      console.log("Registration successful");
      
      // Auto login after successful registration
      await login(data.email, data.password);
      
      // Return user data for the onboarding process
      return userData;
    } catch (error: any) {
      console.error("Registration failed:", error);
      throw new Error(error.message || "Registration failed");
    }
  };

  const logout = async () => {
    try {
      // Using fetch directly instead of apiRequest to ensure proper credentials handling
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Logout request failed");
      }
      
      setUser(null);
      queryClient.clear();
      
      // Redirect to home page after logout
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if the API call fails, clear user state on the client side
      setUser(null);
      queryClient.clear();
      window.location.href = "/";
    }
  };
  
  // Function to refresh user data from the server
  const refreshUserData = async () => {
    try {
      console.log("Refreshing user data from server");
      // Add timestamp to force fresh fetch and avoid caching
      const timestamp = Date.now();
      const response = await apiRequest("GET", `/api/auth/user?_t=${timestamp}`);
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        console.log("User data refreshed successfully", userData);
        
        // Invalidate related queries to ensure consistent data across components
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        if (userData?.id) {
          // Force immediate refetch of user data by invalidating and refetching
          queryClient.invalidateQueries({ queryKey: [`/api/users/${userData.id}`] });
          queryClient.fetchQuery({ queryKey: [`/api/users/${userData.id}`] });
          
          // Also invalidate other related queries
          queryClient.invalidateQueries({ queryKey: [`/api/hosts/${userData.id}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/users/${userData.id}/clubs`] });
        }
        
        return userData;
      } else {
        console.error("Failed to refresh user data: Unauthorized");
        return null;
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        openAuthModal,
        refreshUserData,
      }}
    >
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
