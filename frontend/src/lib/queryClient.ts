import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from './supabaseClient';

/**
 * Legacy API request function for explicit non-Supabase calls
 * Use this explicitly in useQuery when you need to call traditional REST endpoints
 * Example: useQuery({ queryKey: ['/api/endpoint'], queryFn: () => apiRequest('GET', '/api/endpoint') })
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
}

/**
 * Helper function to handle Supabase database queries
 * Supports query patterns like:
 * - ['supabase:table:select', options]
 * - ['supabase:table:single', options]
 */
async function handleSupabaseQuery(
  url: string, 
  queryKey: readonly unknown[]
) {
  try {
    // Parse Supabase query format: 'supabase:table:operation'
    const [, table, operation] = url.split(':');
    
    if (!table || !operation) {
      throw new Error(`Invalid Supabase query format. Expected 'supabase:table:operation', got: ${url}`);
    }
    
    // Handle different operations
    switch (operation) {
      case 'select': {
        // Format: ['supabase:profiles:select', { columns: '*', eq: { id: 'uuid' }, limit: 10, order: {...} }]
        const selectOptions = (queryKey[1] as any) || {};
        let query = supabase.from(table).select(selectOptions.columns || '*');
        
        // Apply filters
        if (selectOptions.eq) {
          Object.entries(selectOptions.eq).forEach(([key, value]) => {
            query = query.eq(key, value as any);
          });
        }
        
        if (selectOptions.neq) {
          Object.entries(selectOptions.neq).forEach(([key, value]) => {
            query = query.neq(key, value as any);
          });
        }
        
        if (selectOptions.gt) {
          Object.entries(selectOptions.gt).forEach(([key, value]) => {
            query = query.gt(key, value as any);
          });
        }
        
        if (selectOptions.gte) {
          Object.entries(selectOptions.gte).forEach(([key, value]) => {
            query = query.gte(key, value as any);
          });
        }
        
        if (selectOptions.lt) {
          Object.entries(selectOptions.lt).forEach(([key, value]) => {
            query = query.lt(key, value as any);
          });
        }
        
        if (selectOptions.lte) {
          Object.entries(selectOptions.lte).forEach(([key, value]) => {
            query = query.lte(key, value as any);
          });
        }
        
        if (selectOptions.like) {
          Object.entries(selectOptions.like).forEach(([key, value]) => {
            query = query.like(key, value as any);
          });
        }
        
        if (selectOptions.ilike) {
          Object.entries(selectOptions.ilike).forEach(([key, value]) => {
            query = query.ilike(key, value as any);
          });
        }
        
        if (selectOptions.in) {
          Object.entries(selectOptions.in).forEach(([key, value]) => {
            query = query.in(key, value as any[]);
          });
        }
        
        if (selectOptions.limit) {
          query = query.limit(selectOptions.limit);
        }
        
        if (selectOptions.order) {
          query = query.order(selectOptions.order.column, { 
            ascending: selectOptions.order.ascending ?? true 
          });
        }
        
        if (selectOptions.range) {
          query = query.range(selectOptions.range.from, selectOptions.range.to);
        }
        
        // Handle complex filters object for search functionality
        if (selectOptions.filters) {
          const filters = selectOptions.filters;
          
          // Location filter - search in club names and locations
          if (filters.location && filters.location.trim()) {
            // For now, just search in club names to avoid OR syntax issues
            const searchTerm = filters.location.trim();
            query = query.ilike('clubs.name', `%${searchTerm}%`);
            // TODO: Implement proper club search with dropdown autocomplete
          }
          
          // Date range filters
          if (filters.date) {
            const startDate = new Date(filters.date);
            startDate.setHours(0, 0, 0, 0);
            query = query.gte('date', startDate.toISOString());
            
            if (filters.endDate) {
              const endDate = new Date(filters.endDate);
              endDate.setHours(23, 59, 59, 999);
              query = query.lte('date', endDate.toISOString());
            } else {
              // If only start date, search for that entire day
              const endOfDay = new Date(startDate);
              endOfDay.setHours(23, 59, 59, 999);
              query = query.lte('date', endOfDay.toISOString());
            }
          }
          
          // Players filter - ensure listing allows at least the requested number of players
          if (filters.players && filters.players !== '0') {
            query = query.gte('players_allowed', parseInt(filters.players));
          }
          
          // Always filter for available listings only
          query = query.eq('status', 'available');
          
          // Ensure future dates only
          if (!filters.date) {
            query = query.gte('date', new Date().toISOString());
          }
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw new Error(`Supabase select error: ${error.message}`);
        }
        
        return data;
      }
        
      case 'single': {
        // Format: ['supabase:profiles:single', { id: 'uuid', columns: '*' }]
        const singleOptions = (queryKey[1] as any) || {};
        let query = supabase.from(table).select(singleOptions.columns || '*');
        
        // Apply filters for single record
        if (singleOptions.eq) {
          Object.entries(singleOptions.eq).forEach(([key, value]) => {
            query = query.eq(key, value as any);
          });
        }
        
        // Simplified single record lookup by id
        if (singleOptions.id) {
          query = query.eq('id', singleOptions.id);
        }
        
        const { data, error } = await query.single();
        
        if (error) {
          throw new Error(`Supabase single error: ${error.message}`);
        }
        
        return data;
      }
      
      case 'count': {
        // Format: ['supabase:table:count', { eq: { status: 'active' } }]
        const countOptions = (queryKey[1] as any) || {};
        let query = supabase.from(table).select('*', { count: 'exact', head: true });
        
        // Apply filters for count
        if (countOptions.eq) {
          Object.entries(countOptions.eq).forEach(([key, value]) => {
            query = query.eq(key, value as any);
          });
        }
        
        const { count, error } = await query;
        
        if (error) {
          throw new Error(`Supabase count error: ${error.message}`);
        }
        
        return { count };
      }
        
      default:
        throw new Error(`Unsupported Supabase operation: ${operation}. Supported operations: select, single, count`);
    }
    
  } catch (error) {
    console.error('Supabase query error:', error);
    throw error;
  }
}

/**
 * Default Query Function for TanStack Query
 * Primarily handles Supabase queries (queryKey[0] starting with 'supabase:')
 * Throws error for non-Supabase patterns to encourage explicit handling
 */
const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const queryIdentifier = queryKey[0] as string;
  
  // Handle Supabase queries
  if (queryIdentifier.startsWith('supabase:')) {
    return handleSupabaseQuery(queryIdentifier, queryKey);
  }
  
  // Reject non-Supabase patterns
  throw new Error(
    `Unsupported queryKey format: "${queryIdentifier}". ` +
    `The default queryFn only supports Supabase queries (starting with 'supabase:'). ` +
    `For legacy API calls, use an explicit queryFn: ` +
    `useQuery({ queryKey: ['${queryIdentifier}'], queryFn: () => apiRequest('GET', '${queryIdentifier}') })`
  );
};

/**
 * Helper functions for common Supabase query patterns
 * These provide a convenient, type-safe way to construct Supabase queries
 */
export const supabaseQueries = {
  // Profile queries
  profile: {
    byId: (userId: string) => [
      'supabase:profiles:single',
      { id: userId }
    ] as const,
    
    all: (limit?: number) => [
      'supabase:profiles:select',
      { 
        columns: 'id, username, first_name, last_name, profile_image_url, is_host',
        limit,
        order: { column: 'created_at', ascending: false }
      }
    ] as const,
  },
  
  // Club queries
  clubs: {
    all: (limit?: number) => [
      'supabase:clubs:select',
      { 
        columns: '*',
        limit,
        order: { column: 'created_at', ascending: false }
      }
    ] as const,
    
    byId: (clubId: number) => [
      'supabase:clubs:single',
      { id: clubId }
    ] as const,
    
    search: (searchTerm: string, limit = 10) => [
      'supabase:clubs:select',
      {
        columns: '*',
        like: { name: `%${searchTerm}%` },
        limit,
        order: { column: 'name', ascending: true }
      }
    ] as const,
  },
  
  // Booking queries
  bookings: {
    byUserId: (userId: string) => [
      'supabase:bookings:select',
      {
        columns: `
          *,
          tee_time_listings (
            *,
            clubs (name, location)
          )
        `,
        eq: { guest_id: userId },
        order: { column: 'created_at', ascending: false }
      }
    ] as const,
    
    byStatus: (status: string, limit?: number) => [
      'supabase:bookings:select',
      {
        columns: `
          *,
          tee_time_listings (
            *,
            clubs (name, location)
          )
        `,
        eq: { status },
        limit,
        order: { column: 'created_at', ascending: false }
      }
    ] as const,
  },
  
  // Tee Time Listing queries
  teeTimeListings: {
    byHostId: (hostId: string) => [
      'supabase:tee_time_listings:select',
      {
        columns: `
          *,
          clubs (name, location),
          bookings (*)
        `,
        eq: { host_id: hostId },
        order: { column: 'date', ascending: true }
      }
    ] as const,
    
    available: (limit?: number) => [
      'supabase:tee_time_listings:select',
      {
        columns: `
          *,
          clubs (name, location)
        `,
        eq: { status: 'available' },
        gte: { date: new Date().toISOString() },
        limit,
        order: { column: 'date', ascending: true }
      }
    ] as const,
    
    byClubId: (clubId: number, limit?: number) => [
      'supabase:tee_time_listings:select',
      {
        columns: `
          *,
          clubs (name, location)
        `,
        eq: { club_id: clubId },
        limit,
        order: { column: 'date', ascending: true }
      }
    ] as const,
  },
  
  // Message queries
  messages: {
    byUserId: (userId: string) => [
      'supabase:messages:select',
      {
        columns: `
          *,
          sender:sender_id (first_name, last_name, profile_image_url),
          receiver:receiver_id (first_name, last_name, profile_image_url)
        `,
        eq: { receiver_id: userId },
        order: { column: 'created_at', ascending: false }
      }
    ] as const,
  },
  
  // Review queries
  reviews: {
    byTargetId: (targetId: string, targetType: 'host' | 'guest' | 'club') => [
      'supabase:reviews:select',
      {
        columns: `
          *,
          reviewer:reviewer_id (first_name, last_name, profile_image_url)
        `,
        eq: { target_id: targetId, target_type: targetType },
        order: { column: 'created_at', ascending: false }
      }
    ] as const,
    
    byReviewerId: (reviewerId: string) => [
      'supabase:reviews:select',
      {
        columns: '*',
        eq: { reviewer_id: reviewerId },
        order: { column: 'created_at', ascending: false }
      }
    ] as const,
  },
};

/**
 * Configured TanStack Query Client
 * Uses Supabase-focused defaultQueryFn with optimized caching and error handling
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 30000, // 30 seconds
      retry: (failureCount, error) => {
        // Don't retry on certain Supabase errors
        if (error.message.includes('Supabase') && error.message.includes('PGRST')) {
          return false;
        }
        // Don't retry configuration errors
        if (error.message.includes('Unsupported queryKey format')) {
          return false;
        }
        // Retry other errors up to 2 times
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});
