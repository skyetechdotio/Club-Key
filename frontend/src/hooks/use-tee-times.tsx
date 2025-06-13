import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export interface TeeTimeListing {
  id: number;
  hostId: number;
  clubId: number;
  date: string;
  price: number;
  playersAllowed: number;
  notes?: string;
  status: string;
  createdAt: string;
  host?: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  };
  club?: {
    id: number;
    name: string;
    location: string;
    description?: string;
    imageUrl?: string;
  };
  hostRating: number;
  reviewCount: number;
}

export interface TeeTimeBooking {
  id: number;
  teeTimeId: number;
  guestId: number;
  numberOfPlayers: number;
  status: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  completedAt?: string;
  totalPrice: number;
  teeTime?: TeeTimeListing;
  guest?: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  };
}

export interface CreateTeeTimeData {
  hostId: string; // UUID for Supabase
  clubId: number;
  date: Date | string;
  price: number;
  playersAllowed: number;
  notes?: string;
}

export interface BookTeeTimeData {
  teeTimeId: number;
  guestId: number;
  numberOfPlayers: number;
  totalPrice: number;
}

// Fetch all available tee time listings
export function useTeeTimeListings(filters?: any) {
  return useQuery({
    queryKey: ['/api/tee-times', filters],
    queryFn: async () => {
      const url = new URL('/api/tee-times', window.location.origin);
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            url.searchParams.append(key, String(value));
          }
        });
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error('Failed to fetch tee time listings');
      }
      
      return response.json();
    },
  });
}

// Fetch a single tee time listing by ID
export function useTeeTimeListing(id?: number) {
  return useQuery({
    queryKey: [`/api/tee-times/${id}`],
    queryFn: async () => {
      if (!id) return null;
      
      const response = await fetch(`/api/tee-times/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tee time listing');
      }
      
      return response.json();
    },
    enabled: !!id,
  });
}

// Fetch tee time listings by host ID
export function useHostTeeTimeListings(hostId?: number) {
  return useQuery({
    queryKey: ['/api/hosts', hostId, 'tee-times'],
    queryFn: async () => {
      if (!hostId) return [];
      
      const response = await fetch(`/api/hosts/${hostId}/tee-times`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch host tee time listings');
      }
      
      return response.json();
    },
    enabled: !!hostId,
  });
}

// Fetch bookings for a user
export function useUserBookings(userId?: number) {
  return useQuery({
    queryKey: [`/api/users/${userId}/bookings`],
    queryFn: async () => {
      if (!userId) return [];
      
      const response = await fetch(`/api/users/${userId}/bookings`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user bookings');
      }
      
      return response.json();
    },
    enabled: !!userId,
  });
}

// Fetch bookings for a host
export function useHostBookings(hostId?: number) {
  return useQuery({
    queryKey: [`/api/hosts/${hostId}/bookings`],
    queryFn: async () => {
      if (!hostId) return [];
      
      const response = await fetch(`/api/hosts/${hostId}/bookings`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch host bookings');
      }
      
      return response.json();
    },
    enabled: !!hostId,
  });
}

// Create a new tee time listing using Supabase
export function useCreateTeeTime() {
  return useMutation({
    mutationFn: async (data: CreateTeeTimeData) => {
      // Import supabase client
      const { supabase } = await import('@/lib/supabaseClient');
      
      // Prepare data for Supabase insertion
      const insertData = {
        host_id: data.hostId,
        club_id: data.clubId,
        date: typeof data.date === 'object' && data.date instanceof Date ? data.date.toISOString() : data.date,
        price: data.price,
        players_allowed: data.playersAllowed,
        notes: data.notes || null,
        status: 'available',
      };
      
      const { data: result, error } = await supabase
        .from('tee_time_listings')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return result;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['supabase:tee_time_listings:select'] });
      queryClient.invalidateQueries({ 
        queryKey: ['supabase:tee_time_listings:select', { eq: { host_id: data.host_id } }] 
      });
    },
  });
}

// Book a tee time
export function useBookTeeTime() {
  return useMutation({
    mutationFn: async (data: BookTeeTimeData) => {
      const response = await apiRequest('POST', '/api/bookings', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tee-times'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${data.guestId}/bookings`] });
    },
  });
}

// Update a booking status
export function useUpdateBookingStatus() {
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest('PUT', `/api/bookings/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hosts'] });
    },
  });
}

// Create a payment intent for a booking (legacy)
export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: async (bookingId: number) => {
      console.log('Creating payment intent for booking ID:', bookingId);
      const response = await apiRequest('POST', '/api/create-payment-intent', { bookingId });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }
      return response.json();
    },
  });
}

// Create a direct payment intent without a booking first (new flow)
export interface DirectPaymentIntentData {
  amount: number;
  teeTimeId: number;
  metadata?: any;
}

export function useCreateDirectPaymentIntent() {
  return useMutation({
    mutationFn: async (data: DirectPaymentIntentData) => {
      console.log('Creating direct payment intent:', data);
      const response = await apiRequest('POST', '/api/create-direct-payment-intent', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }
      return response.json();
    },
  });
}
