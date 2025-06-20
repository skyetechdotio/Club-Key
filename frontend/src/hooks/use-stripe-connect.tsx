import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";

interface StripeConnectResponse {
  account_id: string;
  account_link: string;
  success: boolean;
}

interface StripeAccountStatus {
  connected: boolean;
  onboarding_complete: boolean;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

// Hook to create or access Stripe Connect account
export function useCreateStripeConnectAccount() {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (): Promise<StripeConnectResponse> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the current session to include auth headers
      const response = await fetch('/api/functions/v1/create-stripe-connect-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
  });
}

// Hook to check Stripe Connect account status
export function useStripeConnectStatus() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['stripe-connect-status', user?.id],
    queryFn: async (): Promise<StripeAccountStatus> => {
      if (!user?.stripe_connect_id) {
        return {
          connected: false,
          onboarding_complete: false,
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
        };
      }

      // TODO: Create an edge function to check actual Stripe account status
      // For now, assume if they have a stripe_connect_id, they're connected
      // In a real implementation, you'd call Stripe's API to check account status
      return {
        connected: true,
        onboarding_complete: true,
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
      };
    },
    enabled: !!user && !!user.isHost,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// Hook to generate Stripe Express dashboard link
export function useStripeExpressDashboard() {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (): Promise<{ url: string }> => {
      if (!user?.stripe_connect_id) {
        throw new Error('No Stripe Connect account found');
      }

      // TODO: Create an edge function to generate Express dashboard links
      // For now, return the main Stripe dashboard
      return {
        url: 'https://dashboard.stripe.com/express'
      };
    },
  });
}