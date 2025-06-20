import { useQuery } from "@tanstack/react-query";

// Interface for club data
export interface Club {
  id: number;
  name: string;
  location: string;
  description?: string;
  image_url?: string;
  created_at: string;
}

// Fetch all clubs for dropdown/autocomplete
export function useClubs() {
  return useQuery<Club[]>({
    queryKey: [
      'supabase:clubs:select',
      {
        columns: 'id,name,location',
        order: { column: 'name', ascending: true }
      }
    ],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Search clubs by name or location
export function useClubSearch(searchTerm: string) {
  return useQuery<Club[]>({
    queryKey: [
      'supabase:clubs:select',
      {
        columns: 'id,name,location,image_url',
        or: `name.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`,
        order: { column: 'name', ascending: true },
        limit: 10
      }
    ],
    enabled: searchTerm.length >= 2, // Only search with 2+ characters
    staleTime: 30 * 1000, // Cache for 30 seconds
  });
}