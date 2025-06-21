import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { useCreateStripeConnectAccount, useStripeConnectStatus, useStripeExpressDashboard } from "@/hooks/use-stripe-connect";
import { CreditCard, ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function StripeConnect() {
  const { user } = useAuthStore();
  const { toast } = useToast();

  // Hooks for Stripe Connect functionality
  const { data: stripeStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useStripeConnectStatus();
  const { mutate: createStripeAccount, isPending: isCreatingAccount } = useCreateStripeConnectAccount();
  const { mutate: getDashboardLink, isPending: isGettingDashboard } = useStripeExpressDashboard();

  // Handle URL parameters for Stripe Connect redirects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeSuccess = urlParams.get('stripe_success');
    const stripeRefresh = urlParams.get('stripe_refresh');

    if (stripeSuccess) {
      toast({
        title: "Stripe Account Connected!",
        description: "Your account has been successfully connected. You can now receive payments.",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh status
      refetchStatus();
    }

    if (stripeRefresh) {
      toast({
        title: "Setup Incomplete",
        description: "Your Stripe account setup needs to be completed to receive payments.",
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast, refetchStatus]);

  const handleConnectStripe = () => {
    createStripeAccount(undefined, {
      onSuccess: (data) => {
        if (data.success && data.account_link) {
          // Redirect to Stripe Connect onboarding
          window.location.href = data.account_link;
        } else {
          throw new Error('Invalid response from server');
        }
      },
      onError: (error) => {
        console.error('Error connecting to Stripe:', error);
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect your Stripe account. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleManageStripeAccount = () => {
    getDashboardLink(undefined, {
      onSuccess: (data) => {
        toast({
          title: "Redirecting to Stripe",
          description: "Opening your Stripe Express dashboard...",
        });
        window.open(data.url, '_blank');
      },
      onError: (error) => {
        console.error('Error accessing Stripe dashboard:', error);
        toast({
          title: "Access Failed",
          description: error.message || "Failed to access your Stripe dashboard. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  if (!user?.isHost) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Setup
        </CardTitle>
        <CardDescription>
          Connect your bank account to receive payments from guests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingStatus ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-neutral-medium">Checking status...</span>
          </div>
        ) : stripeStatus?.connected && stripeStatus?.onboarding_complete ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Connected
              </Badge>
            </div>
            <p className="text-sm text-neutral-medium">
              Your Stripe account is connected and ready to receive payments.
            </p>
            <Button 
              variant="outline" 
              onClick={handleManageStripeAccount}
              disabled={isGettingDashboard}
              className="w-full"
            >
              {isGettingDashboard ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Manage Stripe Account
                </>
              )}
            </Button>
          </div>
        ) : user?.stripe_connect_id ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                Setup Incomplete
              </Badge>
            </div>
            <p className="text-sm text-neutral-medium">
              Your Stripe account needs additional setup to receive payments.
            </p>
            <Button 
              onClick={handleConnectStripe}
              disabled={isCreatingAccount}
              className="w-full"
            >
              {isCreatingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Complete Setup
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Not Connected
              </Badge>
            </div>
            <p className="text-sm text-neutral-medium">
              Connect your bank account with Stripe to start receiving payments from guests. This is required to host tee times.
            </p>
            <Button 
              onClick={handleConnectStripe}
              disabled={isCreatingAccount}
              className="w-full"
            >
              {isCreatingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Connect Stripe Account
                </>
              )}
            </Button>
            <p className="text-xs text-neutral-medium">
              Powered by Stripe Express - secure and trusted by millions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}