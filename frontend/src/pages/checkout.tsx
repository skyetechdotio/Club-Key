import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useCreateStripePaymentIntent } from "@/hooks/use-tee-times";
import { useStripe, useElements, Elements, PaymentElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime } from "@/lib/utils";
import { AlertCircle, ArrowLeft, CalendarDays, Clock, Loader2, Users } from "lucide-react";
import { Helmet } from 'react-helmet';

// Verify Stripe API keys
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.warn('Missing VITE_STRIPE_PUBLIC_KEY environment variable');
}

// Initialize Stripe outside of component to avoid recreating on every render
// Only allow card payments
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY) 
  : null;


function CheckoutForm({ bookingId, onSuccess }: { bookingId: number; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Stripe Not Ready",
        description: "Payment system is still initializing. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    console.log('[CHECKOUT] Processing payment submission...');

    try {
      // Use the simplest confirmation flow with mandatory redirect
      await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Make the customer return to their dashboard after payment
          return_url: window.location.origin + "/dashboard",
        },
        // Always redirect to avoid client-side handling
        redirect: "always",
      });
      
      // This code should never execute due to the redirect
      console.log('[CHECKOUT] Redirect failed, showing fallback message');
      toast({
        title: "Processing Payment",
        description: "Your payment is being processed. Please check your dashboard for confirmation.",
      });
    } catch (err) {
      console.error('[CHECKOUT] Unexpected payment error:', err);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement 
        className="mb-6" 
        options={{
          // Extremely minimal options to avoid issues
          layout: 'tabs',
          defaultValues: {
            billingDetails: {
              name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
              email: user?.email || ''
            }
          }
        }}
      />
      <div className="mb-4 border rounded-md p-3 bg-neutral-50">
        <h3 className="text-sm font-semibold mb-1">Test Card Numbers:</h3>
        <p className="text-xs text-neutral-500 mb-1">4242 4242 4242 4242 - Payment succeeds</p>
        <p className="text-xs text-neutral-500 mb-1">4000 0025 0000 3155 - Requires authentication</p>
        <p className="text-xs text-neutral-500">4000 0000 0000 0002 - Payment declined</p>
      </div>
      <div className="text-sm text-neutral-medium mb-6">
        <p>Your payment will be held in escrow and only released to the host 24 hours after your tee time is completed.</p>
      </div>
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          "Confirm and Pay"
        )}
      </Button>
    </form>
  );
}

export default function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { mutate: createPaymentIntent, isPending } = useCreateStripePaymentIntent();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal("login");
      navigate("/");
    }
  }, [isAuthenticated, openAuthModal, navigate]);

  // Fetch booking details using Supabase
  const { data: booking, isLoading, error } = useQuery({
    queryKey: [`booking-${bookingId}`],
    queryFn: async () => {
      if (!bookingId) return null;
      
      const { supabase } = await import('@/lib/supabaseClient');
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          tee_time_listings (
            *,
            clubs (
              id,
              name,
              location
            ),
            host:host_id (
              id,
              first_name,
              last_name,
              username,
              stripe_connect_id
            )
          )
        `)
        .eq('id', bookingId)
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    enabled: !!bookingId && isAuthenticated,
  });

  // Create payment intent when booking data is loaded
  useEffect(() => {
    if (booking && !clientSecret && !isPending) {
      console.log('Creating payment intent for booking:', booking);
      
      // If a booking already exists, check its status first
      if (booking.status === 'confirmed') {
        console.log('Booking is already confirmed, redirecting to dashboard');
        toast({
          title: "Booking Already Confirmed",
          description: "Your booking is already confirmed. Redirecting to dashboard.",
        });
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
        return;
      }
      
      // Check if host has Stripe Connect account
      const teeTimeListing = booking.tee_time_listings;
      const host = teeTimeListing?.host;
      
      if (!host?.stripe_connect_id) {
        toast({
          title: "Payment Setup Error",
          description: "The host has not set up their payment account yet. Please contact them or try again later.",
          variant: "destructive",
        });
        return;
      }
      
      createPaymentIntent({
        teeTimeId: booking.tee_time_id,
        numberOfPlayers: booking.number_of_players,
      }, {
        onSuccess: (data) => {
          console.log('Payment intent created successfully, client secret received');
          setClientSecret(data.client_secret);
        },
        onError: (error) => {
          console.error('Payment intent creation failed:', error);
          toast({
            title: "Payment Setup Failed",
            description: error.message || "Failed to set up payment. Please try again.",
            variant: "destructive",
          });
        },
      });
    }
  }, [booking, bookingId, clientSecret, createPaymentIntent, isPending, toast, navigate]);

  const handleSuccessfulPayment = () => {
    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  };

  if (isLoading || !booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-neutral-dark">Error Loading Booking</h1>
          <p className="mt-2 text-neutral-medium">We couldn't load the booking details. Please try again later.</p>
          <Button className="mt-6" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const teeTimeListing = booking.tee_time_listings;
  const club = teeTimeListing?.clubs;

  return (
    <>
      <Helmet>
        <title>Checkout | Linx</title>
        <meta name="description" content="Complete your tee time booking payment securely. Your payment will be held in escrow until after your golf session is completed." />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Button 
            variant="ghost" 
            className="pl-0" 
            onClick={() => navigate(`/tee-times/${teeTimeListing?.id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tee Time
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Complete Your Booking</CardTitle>
                <CardDescription>
                  Review and pay for your tee time reservation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientSecret ? (
                  <Elements 
                    stripe={stripePromise} 
                    options={{ 
                      clientSecret
                    }}>
                    <CheckoutForm bookingId={parseInt(bookingId)} onSuccess={handleSuccessfulPayment} />
                  </Elements>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Setting up payment...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg">{club?.name}</h3>
                    <p className="text-neutral-medium">{club?.location}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <CalendarDays className="h-4 w-4 text-primary mr-2" />
                      <span>{formatDate(teeTimeListing?.date)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-primary mr-2" />
                      <span>{formatTime(teeTimeListing?.date)}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-primary mr-2" />
                      <span>{booking.number_of_players} player{booking.number_of_players > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>${teeTimeListing?.price} × {booking.number_of_players} players</span>
                      <span>${(teeTimeListing?.price * booking.number_of_players).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Guest service fee (5%)</span>
                      <span>${((teeTimeListing?.price * booking.number_of_players) * 0.05).toFixed(2)}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>${booking.total_price}</span>
                    </div>
                  </div>

                  <div className="pt-4 text-sm">
                    <p className="font-medium">Cancellation Policy</p>
                    <p className="text-neutral-medium">Free cancellation up to 48 hours before your tee time. After that, no refunds.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
