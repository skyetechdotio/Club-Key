import { useQuery } from "@tanstack/react-query";

// Interface for user clubs data from Supabase
export interface UserClub {
  id: string;
  user_id: string;
  club_id: string;
  member_since: string;
  clubs: {
    id: string;
    name: string;
    location: string;
  };
}

// Interface for tee time listings from Supabase
export interface TeeTimeListing {
  id: string;
  host_id: string;
  club_id: string;
  date: string;
  price: number;
  players_allowed: number;
  notes?: string;
  status: string;
  created_at: string;
  clubs?: {
    id: string;
    name: string;
    location: string;
    image_url?: string;
  };
  bookings?: any[];
}

/**
 * Hook to fetch user clubs for a specific user using Supabase
 * @param userId - The user ID to fetch clubs for
 * @param enabled - Whether the query should be enabled
 */
export function useUserClubs(userId?: string, enabled: boolean = true) {
  return useQuery<UserClub[]>({
    queryKey: [
      'supabase:user_clubs:select',
      {
        columns: `
          id,
          user_id,
          club_id,
          member_since,
          clubs (
            id,
            name,
            location
          )
        `,
        eq: { user_id: userId },
        order: { column: 'member_since', ascending: false }
      }
    ],
    enabled: enabled && !!userId,
  });
}

/**
 * Hook to fetch tee time listings for a specific host using Supabase
 * @param hostId - The host user ID to fetch listings for
 * @param enabled - Whether the query should be enabled
 */
export function useHostTeeTimeListingsSupabase(hostId?: string, enabled: boolean = true) {
  return useQuery<TeeTimeListing[]>({
    queryKey: [
      'supabase:tee_time_listings:select',
      {
        columns: `
          *,
          clubs (
            id,
            name,
            location,
            image_url
          )
        `,
        eq: { host_id: hostId },
        order: { column: 'date', ascending: true }
      }
    ],
    enabled: enabled && !!hostId,
  });
}

/**
 * Hook to fetch all available tee time listings using Supabase
 * @param limit - Maximum number of listings to fetch
 */
export function useAvailableTeeTimeListings(limit?: number) {
  return useQuery<TeeTimeListing[]>({
    queryKey: [
      'supabase:tee_time_listings:select',
      {
        columns: `
          *,
          clubs (
            id,
            name,
            location,
            image_url
          )
        `,
        eq: { status: 'available' },
        gte: { date: new Date().toISOString() },
        limit,
        order: { column: 'date', ascending: true }
      }
    ],
  });
}

/**
 * Hook to fetch tee time listings by club ID using Supabase
 * @param clubId - The club ID to fetch listings for
 * @param limit - Maximum number of listings to fetch
 */
export function useTeeTimeListingsByClub(clubId?: number, limit?: number) {
  return useQuery<TeeTimeListing[]>({
    queryKey: [
      'supabase:tee_time_listings:select',
      {
        columns: `
          *,
          clubs (
            id,
            name,
            location,
            image_url
          )
        `,
        eq: { club_id: clubId },
        limit,
        order: { column: 'date', ascending: true }
      }
    ],
    enabled: !!clubId,
  });
}

// Interface for club data from Supabase
export interface Club {
  id: number;
  name: string;
  location: string;
  description?: string;
  image_url?: string;
  created_at: string;
}

/**
 * Hook to fetch all clubs using Supabase
 * @param limit - Maximum number of clubs to fetch
 */
export function useClubs(limit?: number) {
  return useQuery<Club[]>({
    queryKey: [
      'supabase:clubs:select',
      {
        columns: 'id, name, location, description, image_url, created_at',
        limit,
        order: { column: 'name', ascending: true }
      }
    ],
  });
}

/**
 * Hook to search clubs by name using Supabase
 * @param searchTerm - The search term to filter clubs
 * @param limit - Maximum number of clubs to fetch
 */
export function useClubSearch(searchTerm: string, limit = 10) {
  return useQuery<Club[]>({
    queryKey: [
      'supabase:clubs:select',
      {
        columns: 'id, name, location, description, image_url',
        like: { name: `%${searchTerm}%` },
        limit,
        order: { column: 'name', ascending: true }
      }
    ],
    enabled: searchTerm.length > 0,
  });
}