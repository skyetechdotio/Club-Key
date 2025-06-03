import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ArrowLeft, CalendarDays, Clock, Loader2, Users } from "lucide-react";
import { formatDate, formatTime, formatPrice } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTeeTimeListing } from "@/hooks/use-tee-times";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

// Hook for manual booking confirmation when regular flow fails
function useManualBookingConfirmation() {
  const { toast } = useToast();
  
  return async (bookingId: number): Promise<boolean> => {
    try {
      console.log(`Attempting manual booking confirmation for booking ID: ${bookingId}`);
      
      const response = await fetch(`/api/bookings/${bookingId}/confirm-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to confirm booking');
      }
      
      const confirmedBooking = await response.json();
      console.log('Manual booking confirmation successful:', confirmedBooking);
      
      return true;
    } catch (error: any) {
      console.error('Manual booking confirmation failed:', error);
      toast({
        title: "Booking Confirmation Failed",
        description: error.message || "Failed to confirm your booking. Please contact support.",
        variant: "destructive",
      });
      return false;
    }
  };
}

function PaymentForm({ teeTimeId, onSuccess }: { teeTimeId: number; onSuccess: (bookingId: number) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Retrieve the booking info from localStorage
  const bookingInfoStr = localStorage.getItem('pendingBookingInfo');
  const bookingInfo = bookingInfoStr ? JSON.parse(bookingInfoStr) : null;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !bookingInfo) {
      toast({
        title: "Cannot Process Payment",
        description: "Payment system is not ready or booking information is missing.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    console.log('Processing payment submission...');

    try {
      // Step 1: Create booking first in pending state
      console.log('Creating pending booking...');
      const bookingResponse = await apiRequest('POST', '/api/bookings', {
        ...bookingInfo,
        status: 'payment_pending' // Special status to indicate payment is in process
      });
      
      if (!bookingResponse.ok) {
        const errorData = await bookingResponse.json();
        throw new Error(errorData.message || 'Failed to create booking');
      }
      
      const booking = await bookingResponse.json();
      console.log('Pending booking created:', booking);
      
      // Step 2: Process payment with Stripe and always redirect
      console.log('Processing payment with Stripe (redirect mode)...');
      
      // Always redirect to dashboard after payment processing
      // The webhook will handle the payment confirmation on the server
      await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/dashboard",
        },
        redirect: "always",
      });
      
      // This code should never execute, but as a fallback:
      localStorage.removeItem('pendingBookingInfo');
      toast({
        title: "Processing Payment",
        description: "Your payment is being processed. Please check your dashboard for status updates.",
      });
      onSuccess(booking.id);
      
    } catch (err: any) {
      console.error('Error processing booking:', err);
      toast({
        title: "Booking Error",
        description: err.message || "An error occurred while processing your booking",
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
      <div className="text-sm text-neutral-medium mb-6">
        <p>Your payment will be held in escrow and only released to the host 24 hours after your tee time is completed.</p>
        
        <div className="bg-secondary/20 p-3 rounded-md mt-4">
          <p className="font-medium text-primary mb-1">Test Card Information</p>
          <p className="text-xs">This is a test environment. Use these test cards to complete the payment:</p>
          <ul className="text-xs mt-1 space-y-1">
            <li>• Success: <span className="font-mono">4242 4242 4242 4242</span></li>
            <li>• Auth Required: <span className="font-mono">4000 0025 0000 3155</span></li>
            <li>• Decline: <span className="font-mono">4000 0000 0000 0002</span></li>
            <li>• Use any future date, any 3 digits for CVC, and any 5 digits for ZIP</li>
          </ul>
        </div>
      </div>
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Confirm and Pay"
        )}
      </Button>
    </form>
  );
}

export default function PreCheckoutPage() {
  const { teeTimeId } = useParams<{ teeTimeId: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  
  // Retrieve the booking info from localStorage
  const bookingInfoStr = localStorage.getItem('pendingBookingInfo');
  const bookingInfo = bookingInfoStr ? JSON.parse(bookingInfoStr) : null;

  // Fetch tee time details
  const { data: teeTime, isLoading: isLoadingTeeTime, error: teeTimeError } = 
    useTeeTimeListing(teeTimeId ? parseInt(teeTimeId) : undefined);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal("login");
      navigate("/");
    }
  }, [isAuthenticated, openAuthModal, navigate]);

  // Redirect if no booking info in localStorage
  useEffect(() => {
    if (!bookingInfo && !isLoadingTeeTime && isAuthenticated) {
      toast({
        title: "Booking Information Missing",
        description: "Please start the booking process again.",
        variant: "destructive",
      });
      navigate(`/tee-times/${teeTimeId}`);
    }
  }, [bookingInfo, isLoadingTeeTime, isAuthenticated, navigate, teeTimeId, toast]);

  // Create payment intent
  useEffect(() => {
    const createIntent = async () => {
      if (!bookingInfo || !user || isCreatingIntent || clientSecret) return;
      
      try {
        setIsCreatingIntent(true);
        console.log('Creating direct payment intent...');
        
        const response = await apiRequest('POST', '/api/create-direct-payment-intent', {
          amount: bookingInfo.totalPrice,
          teeTimeId: parseInt(teeTimeId),
          metadata: {
            teeTimeId: bookingInfo.teeTimeId,
            guestId: bookingInfo.guestId,
            numberOfPlayers: bookingInfo.numberOfPlayers
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create payment intent');
        }
        
        const data = await response.json();
        console.log('Payment intent created successfully');
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        console.error('Error creating payment intent:', error);
        toast({
          title: "Payment Setup Failed",
          description: error.message || "Failed to set up payment. Please try again.",
          variant: "destructive",
        });
        navigate(`/tee-times/${teeTimeId}`);
      } finally {
        setIsCreatingIntent(false);
      }
    };
    
    createIntent();
  }, [bookingInfo, clientSecret, isCreatingIntent, navigate, teeTimeId, toast, user]);

  const handleSuccessfulPayment = (bookingId: number) => {
    setTimeout(() => {
      navigate(`/dashboard`);
    }, 1500);
  };

  if (isLoadingTeeTime || !teeTime || !bookingInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (teeTimeError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-neutral-dark">Error Loading Tee Time</h1>
          <p className="mt-2 text-neutral-medium">We couldn't load the tee time details. Please try again later.</p>
          <Button className="mt-6" onClick={() => navigate("/tee-times")}>
            Back to Tee Times
          </Button>
        </div>
      </div>
    );
  }

  const club = teeTime.club;
  const numberOfPlayers = bookingInfo.numberOfPlayers;
  const totalPrice = bookingInfo.totalPrice;

  return (
    <>
      <Helmet>
        <title>Complete Booking | Linx</title>
        <meta name="description" content="Complete your tee time booking payment securely. Your payment will be held in escrow until after your golf session is completed." />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Button 
            variant="ghost" 
            className="pl-0" 
            onClick={() => navigate(`/tee-times/${teeTimeId}`)}
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
                {clientSecret && stripePromise ? (
                  <Elements 
                    stripe={stripePromise} 
                    options={{ 
                      clientSecret
                    }}>
                    <PaymentForm teeTimeId={parseInt(teeTimeId)} onSuccess={handleSuccessfulPayment} />
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
                      <span>{formatDate(teeTime?.date)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-primary mr-2" />
                      <span>{formatTime(teeTime?.date)}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-primary mr-2" />
                      <span>{numberOfPlayers} player{numberOfPlayers > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>${teeTime?.price} × {numberOfPlayers} players</span>
                      <span>${totalPrice}</span>
                    </div>
                    
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>${totalPrice}</span>
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