import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error(
    'Missing VITE_SUPABASE_URL environment variable. ' +
    'Please add VITE_SUPABASE_URL to your .env file.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY environment variable. ' +
    'Please add VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

// Create and configure Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic refresh of auth tokens
    autoRefreshToken: true,
    // Persist auth state across browser sessions
    persistSession: true,
    // Detect auth state changes and update accordingly
    detectSessionInUrl: true,
    // Configure auth flow for Vite development
    flowType: 'implicit'
  },
  // Additional configuration for development
  realtime: {
    // Configure realtime settings if needed
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user !== null;
};

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return user;
};

// Helper function to get current user's profile
export const getCurrentUserProfile = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error getting user profile:', error);
    return null;
  }

  return profile;
};

// Export types for better TypeScript support
export type { User, Session, AuthError } from '@supabase/supabase-js';

// Log successful initialization in development
if (import.meta.env.DEV) {
  console.log('✅ Supabase client initialized successfully');
  console.log('🔗 URL:', supabaseUrl);
  console.log('🔑 Anon Key:', supabaseAnonKey ? '***configured***' : 'missing');
} 