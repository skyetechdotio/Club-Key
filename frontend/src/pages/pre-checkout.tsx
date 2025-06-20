import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, ArrowLeft, CalendarDays, Clock, Loader2, Users, Shield, Info } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { useTeeTimeListing, useBookTeeTime, BookTeeTimeData } from "@/hooks/use-tee-times";
import { Helmet } from 'react-helmet';

export default function PreCheckoutPage() {
  console.log('🔍 [PreCheckoutPage] Component rendered');
  
  const { teeTimeId } = useParams<{ teeTimeId: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { toast } = useToast();
  const [bookingInfo, setBookingInfo] = useState<BookTeeTimeData | null>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  
  console.log('🔍 [PreCheckoutPage] Params:', { teeTimeId });
  
  // Hook for creating the booking
  const { mutate: createBooking, isPending: isCreatingBooking } = useBookTeeTime();

  // Fetch tee time details
  const { data: teeTime, isLoading: isLoadingTeeTime, error: teeTimeError } = 
    useTeeTimeListing(teeTimeId ? parseInt(teeTimeId) : undefined);

  // Load booking info from localStorage on mount
  useEffect(() => {
    console.log('🔍 [PreCheckoutPage] Loading booking info from localStorage');
    const bookingInfoStr = localStorage.getItem('pendingBookingInfo');
    console.log('🔍 [PreCheckoutPage] Raw localStorage data:', bookingInfoStr);
    
    if (bookingInfoStr) {
      try {
        const parsedInfo = JSON.parse(bookingInfoStr);
        console.log('🔍 [PreCheckoutPage] Parsed booking info:', parsedInfo);
        setBookingInfo(parsedInfo);
      } catch (error) {
        console.error('Failed to parse booking info from localStorage:', error);
        toast({
          title: "Booking Information Error",
          description: "Invalid booking information. Please start the booking process again.",
          variant: "destructive",
        });
        navigate(`/tee-times/${teeTimeId}`);
      }
    } else {
      console.log('🔍 [PreCheckoutPage] No booking info found in localStorage');
    }
    
    // Mark that we've attempted to load from localStorage
    setHasAttemptedLoad(true);
  }, [navigate, teeTimeId, toast]);

  // Note: Authentication is handled by ProtectedRoute wrapper in App.tsx
  // No need for additional auth check here

  // Redirect if no booking info found (only after we've attempted to load from localStorage)
  useEffect(() => {
    console.log('🔍 [PreCheckoutPage] Checking redirect conditions:', {
      bookingInfo: !!bookingInfo,
      isLoadingTeeTime,
      isAuthenticated,
      hasAttemptedLoad
    });
    
    if (!bookingInfo && !isLoadingTeeTime && isAuthenticated && hasAttemptedLoad) {
      console.log('🔍 [PreCheckoutPage] No booking info found after attempted load, redirecting');
      toast({
        title: "Booking Information Missing",
        description: "Please start the booking process from the tee time details page.",
        variant: "destructive",
      });
      navigate(`/tee-times/${teeTimeId}`);
    }
  }, [bookingInfo, isLoadingTeeTime, isAuthenticated, hasAttemptedLoad, navigate, teeTimeId, toast]);

  // Verify booking info matches the current tee time
  useEffect(() => {
    console.log('🔍 [PreCheckoutPage] Checking booking verification:', {
      bookingInfo: bookingInfo?.teeTimeId,
      teeTime: teeTime?.id,
      mismatch: bookingInfo && teeTime && bookingInfo.teeTimeId !== teeTime.id
    });
    
    if (bookingInfo && teeTime && bookingInfo.teeTimeId !== teeTime.id) {
      console.log('🔍 [PreCheckoutPage] Booking mismatch detected, redirecting');
      toast({
        title: "Booking Mismatch",
        description: "The booking information doesn't match this tee time. Please start again.",
        variant: "destructive",
      });
      localStorage.removeItem('pendingBookingInfo');
      navigate(`/tee-times/${teeTimeId}`);
    }
  }, [bookingInfo, teeTime, navigate, teeTimeId, toast]);

  const handleConfirmBooking = () => {
    if (!bookingInfo || !user) {
      toast({
        title: "Missing Information",
        description: "Booking information or user data is missing.",
        variant: "destructive",
      });
      return;
    }

    // Verify tee time is still available
    if (teeTime?.status !== 'available') {
      toast({
        title: "Tee Time No Longer Available",
        description: "This tee time is no longer available for booking.",
        variant: "destructive",
      });
      navigate(`/tee-times/${teeTimeId}`);
      return;
    }

    // Create the preliminary booking record
    createBooking(bookingInfo, {
      onSuccess: (booking) => {
        toast({
          title: "Booking Created Successfully!",
          description: "Your tee time has been reserved. Proceeding to payment...",
        });
        
        // Clear the localStorage
        localStorage.removeItem('pendingBookingInfo');
        
        // Navigate to checkout page with booking ID
        navigate(`/checkout/${booking.id}`);
      },
      onError: (error) => {
        console.error('Booking creation failed:', error);
        toast({
          title: "Booking Failed",
          description: error.message || "Failed to create your booking. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  if (isLoadingTeeTime) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-neutral-medium">Loading tee time details...</p>
        </div>
      </div>
    );
  }

  if (teeTimeError || !teeTime) {
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

  if (!bookingInfo) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-neutral-medium">Loading booking information...</p>
        </div>
      </div>
    );
  }

  const numberOfPlayers = bookingInfo.numberOfPlayers;
  const totalPrice = bookingInfo.totalPrice;
  const guestFee = Math.round(totalPrice * 0.05 * 100) / 100; // 5% guest fee
  const finalTotal = totalPrice + guestFee;

  return (
    <>
      <Helmet>
        <title>Review Booking | ClubKey</title>
        <meta name="description" content="Review your tee time booking details before confirming your reservation." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Button 
            variant="ghost" 
            className="pl-0" 
            onClick={() => navigate(`/tee-times/${teeTimeId}`)}
            disabled={isCreatingBooking}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tee Time
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Review Your Booking</CardTitle>
                <CardDescription>
                  Please review the details below and confirm your tee time reservation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tee Time Details */}
                <div>
                  <h3 className="font-medium mb-3">Tee Time Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <h4 className="font-bold text-lg">{teeTime.club?.name}</h4>
                      <p className="text-neutral-medium">{teeTime.club?.location}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <CalendarDays className="h-4 w-4 text-primary mr-2" />
                        <span className="text-sm">{formatDate(teeTime.date)}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-primary mr-2" />
                        <span className="text-sm">{formatTime(teeTime.date)}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-primary mr-2" />
                        <span className="text-sm">{numberOfPlayers} player{numberOfPlayers > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Host Information */}
                <div>
                  <h3 className="font-medium mb-3">Your Host</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Avatar className="h-12 w-12 mr-3 border-2 border-white shadow-sm">
                        <AvatarImage src={teeTime.host?.profile_image_url} alt={
                          teeTime.host?.first_name && teeTime.host?.last_name
                            ? `${teeTime.host.first_name} ${teeTime.host.last_name}`
                            : teeTime.host?.username || "Host"
                        } />
                        <AvatarFallback className="bg-primary text-white">
                          {teeTime.host?.first_name && teeTime.host?.last_name
                            ? `${teeTime.host.first_name[0]}${teeTime.host.last_name[0]}`
                            : teeTime.host?.username?.substring(0, 2).toUpperCase() || "H"
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {teeTime.host?.first_name && teeTime.host?.last_name
                            ? `${teeTime.host.first_name} ${teeTime.host.last_name}`
                            : teeTime.host?.username || "Host"
                          }
                        </p>
                        <p className="text-sm text-neutral-medium">
                          Club member and verified host
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Important Information */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800 mb-2">Important Information</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Please arrive 30 minutes before your tee time</li>
                        <li>• Cancellations must be made 24 hours in advance for a full refund</li>
                        <li>• Appropriate golf attire required (collared shirt, no denim)</li>
                        <li>• Golf cart included with your booking</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90" 
                    disabled={isCreatingBooking || teeTime.status !== "available"}
                    onClick={handleConfirmBooking}
                    size="lg"
                  >
                    {isCreatingBooking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Booking...
                      </>
                    ) : (
                      "Confirm Booking"
                    )}
                  </Button>
                  
                  <div className="flex items-center justify-center mt-3">
                    <Shield className="h-4 w-4 text-primary mr-1.5" />
                    <span className="text-xs text-center text-neutral-medium">
                      Your tee time will be reserved immediately
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg">{teeTime.club?.name}</h3>
                    <p className="text-neutral-medium text-sm">{teeTime.club?.location}</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <CalendarDays className="h-4 w-4 text-primary mr-2" />
                      <span>{formatDate(teeTime.date)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-primary mr-2" />
                      <span>{formatTime(teeTime.date)}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-primary mr-2" />
                      <span>{numberOfPlayers} player{numberOfPlayers > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>${teeTime.price} × {numberOfPlayers} players</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Guest service fee (5%)</span>
                      <span>${guestFee.toFixed(2)}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">${finalTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-4 text-xs text-neutral-medium">
                    <p className="font-medium mb-1">Cancellation Policy</p>
                    <p>Free cancellation up to 24 hours before your tee time. After that, no refunds apply.</p>
                  </div>

                  <div className="pt-2 text-xs text-neutral-medium">
                    <p className="font-medium mb-1">Payment Information</p>
                    <p>Secure payment processing via Stripe. Your payment will be held in escrow until 24 hours after your tee time is completed.</p>
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