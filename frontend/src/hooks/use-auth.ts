// Legacy hook for backward compatibility
// This re-exports the Zustand store to maintain API compatibility
// New components should import useAuthStore directly
import { useAuthStore } from '@/stores/authStore';

export const useAuth = () => {
  const store = useAuthStore();
  
  // Return the store with all its properties
  // This ensures components expecting useAuth continue to work
  return store;
};