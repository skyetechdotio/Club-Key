import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUserBookings, useHostBookings, useUserBookingsSupabase, useHostBookingsSupabase, useUpdateTeeTime } from "@/hooks/use-tee-times";
import { useHostTeeTimeListingsSupabase } from "@/hooks/use-profile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useUpdateBookingStatus } from "@/hooks/use-tee-times";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useCreatePaymentIntent } from "@/hooks/use-tee-times";
import { formatDate, formatTime } from "@/lib/utils";
import { CalendarDays, CheckCircle, Clock, Edit2, Volleyball, MessageSquare, Star, Users, Loader2, AlertCircle, Building, MapPin } from "lucide-react";
import { Helmet } from 'react-helmet';
import HostCalendar from "@/components/dashboard/host-calendar";
import StripeConnect from "@/components/dashboard/stripe-connect";

// Interface for Supabase tee time listings
interface TeeTimeListing {
  id: string;
  host_id: string;
  club_id: number;
  date: string;
  price: number;
  players_allowed: number;
  notes?: string;
  status: string;
  created_at: string;
  clubs?: {
    id: number;
    name: string;
    location: string;
    image_url?: string;
  };
}

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { toast } = useToast();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'cancel' | 'complete'>('cancel');
  const { mutate: updateBookingStatus, isPending: isUpdatingStatus } = useUpdateBookingStatus();
  const { mutate: createPaymentIntent, isPending: isCreatingPayment } = useCreatePaymentIntent();
  const { mutate: updateTeeTime, isPending: isCancellingListing } = useUpdateTeeTime();

  console.log('🔍 [Dashboard] Rendering with user:', user);
  console.log('🔍 [Dashboard] User isHost:', user?.isHost);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    openAuthModal("login");
    return null;
  }

  // Fetch data based on user role using Supabase
  const { data: myBookings = [], isLoading: isLoadingBookings = false } = useUserBookingsSupabase(user?.id);
  const { data: hostBookings = [], isLoading: isLoadingHostBookings = false } = useHostBookingsSupabase(user?.isHost ? user.id : undefined);
  
  // Fetch host's tee time listings using Supabase
  const { 
    data: hostTeeTimeListings = [], 
    isLoading: isLoadingTeeTimeListings, 
    error: teeTimeListingsError 
  } = useHostTeeTimeListingsSupabase(user?.id, !!user?.isHost);

  console.log('🔍 [Dashboard] Data loading states:', {
    isLoadingBookings,
    isLoadingHostBookings,
    isLoadingTeeTimeListings,
    myBookings,
    hostBookings,
    hostTeeTimeListings
  });

  const handleUpdateBookingStatus = (booking: any, status: string) => {
    updateBookingStatus(
      { id: booking.id, status },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: `Booking has been ${status}`,
          });
          setIsDialogOpen(false);
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message || `Failed to ${status} booking`,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleCapturePayment = (booking: any) => {
    createPaymentIntent(booking.id, {
      onSuccess: (data) => {
        if (data.hoursRemaining) {
          toast({
            title: "Payment will be captured soon",
            description: `Payment will be automatically captured in ${Math.round(data.hoursRemaining)} hours`,
          });
        } else {
          toast({
            title: "Success",
            description: "Payment has been captured successfully",
          });
        }
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to capture payment",
          variant: "destructive",
        });
      },
    });
  };

  const openDialog = (booking: any, action: 'cancel' | 'complete') => {
    setSelectedBooking(booking);
    setDialogAction(action);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'payment_pending':
        // Show as "Confirmed" to users since payment has been processed
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Confirmed</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Confirmed</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      case 'available':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Available</Badge>;
      case 'booked':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Booked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleEditListing = (listingId: string) => {
    navigate(`/edit-listing/${listingId}`);
  };

  const handleCancelListing = (listingId: string) => {
    updateTeeTime({
      id: listingId,
      status: 'cancelled'
    }, {
      onSuccess: () => {
        toast({
          title: "Listing Cancelled",
          description: "Your tee time listing has been cancelled successfully.",
        });
      },
      onError: (error) => {
        console.error('Cancel listing error:', error);
        toast({
          title: "Failed to Cancel Listing",
          description: error.message || "An error occurred while cancelling your listing. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <>
      <Helmet>
        <title>Dashboard | ClubKey</title>
        <meta name="description" content="Manage your tee time bookings, listings and account information. View your upcoming golf sessions and connect with hosts or guests." />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-dark">Dashboard</h1>
            <p className="text-neutral-medium">Manage your bookings, listings, and account</p>
          </div>
          {user?.isHost && (
            <Button onClick={() => navigate("/create-listing")}>
              <Volleyball className="mr-2 h-4 w-4" /> Create New Listing
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4 mb-6">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user?.profileImage} alt={user?.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.firstName?.[0] || user?.username?.[0] || "U"}
                      {user?.lastName?.[0] || user?.username?.[1] || ""}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-medium">{user?.firstName ? `${user.firstName} ${user.lastName}` : user?.username}</h2>
                    <p className="text-sm text-neutral-medium">{user?.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Link href={`/profile/${user?.id}`}>
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="mr-2 h-4 w-4" /> View Public Profile
                      </Button>
                    </Link>
                  </div>
                  <div>
                    <Link href="/messages">
                      <Button variant="outline" className="w-full justify-start">
                        <MessageSquare className="mr-2 h-4 w-4" /> Messages
                      </Button>
                    </Link>
                  </div>
                </div>

                <Separator className="my-6" />

                {user?.isHost && (
                  <StripeConnect />
                )}

                {!user?.isHost && (
                  <div className="bg-secondary rounded-lg p-4 mb-6">
                    <h3 className="font-medium mb-2">Become a Host</h3>
                    <p className="text-sm text-neutral-medium mb-4">Share access to your club and earn income from your membership</p>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: "Feature Coming Soon",
                          description: "Host registration will be available soon!"
                        });
                      }}
                    >
                      Become a Host
                    </Button>
                  </div>
                )}

                <div className="text-xs text-neutral-medium">
                  <p>Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="bookings">
              <TabsList className="w-full">
                <TabsTrigger value="bookings" className="flex-1">My Bookings</TabsTrigger>
                {user?.isHost && (
                  <>
                    <TabsTrigger value="host-bookings" className="flex-1">Host Bookings</TabsTrigger>
                    <TabsTrigger value="listings" className="flex-1">My Listings</TabsTrigger>
                  </>
                )}
              </TabsList>

              {/* My Bookings Tab */}
              <TabsContent value="bookings">
                <Card>
                  <CardHeader>
                    <CardTitle>My Tee Time Bookings</CardTitle>
                    <CardDescription>
                      View and manage your booked tee times
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingBookings ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : myBookings && myBookings.length > 0 ? (
                      <div className="space-y-6">
                        {myBookings.map((booking: any) => (
                          <div key={booking.id} className="border rounded-lg p-4">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-lg">{booking.tee_time_listings?.clubs?.name}</h3>
                                </div>
                                <p className="text-neutral-medium">{booking.tee_time_listings?.clubs?.location}</p>
                                
                                <div className="mt-4 space-y-2">
                                  <div className="flex items-center">
                                    <CalendarDays className="h-4 w-4 text-primary mr-2" />
                                    <span>{formatDate(booking.tee_time_listings?.date)}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 text-primary mr-2" />
                                    <span>{formatTime(booking.tee_time_listings?.date)}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Users className="h-4 w-4 text-primary mr-2" />
                                    <span>{booking.number_of_players} player{booking.number_of_players > 1 ? 's' : ''}</span>
                                  </div>
                                </div>

                                <div className="mt-4 flex items-center">
                                  <div className="flex-shrink-0 mr-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={booking.tee_time_listings?.host?.profile_image_url} />
                                      <AvatarFallback className="bg-primary text-primary-foreground">
                                        {booking.tee_time_listings?.host?.first_name?.[0] || booking.tee_time_listings?.host?.username?.[0] || "H"}
                                        {booking.tee_time_listings?.host?.last_name?.[0] || booking.tee_time_listings?.host?.username?.[1] || ""}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      Hosted by {
                                        booking.tee_time_listings?.host?.first_name && booking.tee_time_listings?.host?.last_name
                                          ? `${booking.tee_time_listings.host.first_name} ${booking.tee_time_listings.host.last_name}`
                                          : booking.tee_time_listings?.host?.username || "Host"
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col justify-between">
                                <div className="text-right">
                                  <p className="text-lg font-bold text-primary">${parseFloat(booking.total_price).toFixed(2)}</p>
                                  <p className="text-sm text-neutral-medium">
                                    ${parseFloat(booking.tee_time_listings?.price || (booking.total_price / booking.number_of_players)).toFixed(2)} per player
                                  </p>
                                </div>

                                <div className="mt-4 space-y-2">
                                  <Link href={`/messages/${booking.tee_time_listings?.host?.id}`}>
                                    <Button variant="outline" className="w-full">
                                      <MessageSquare className="mr-2 h-4 w-4" /> Message Host
                                    </Button>
                                  </Link>
                                  
                                  {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                                    <Button 
                                      variant="outline" 
                                      className="w-full text-destructive hover:text-destructive"
                                      onClick={() => openDialog(booking, 'cancel')}
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                  
                                  {booking.status === 'completed' && !booking.reviewed && (
                                    <Button className="w-full">
                                      <Star className="mr-2 h-4 w-4" /> Write Review
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <CalendarDays className="h-12 w-12 mx-auto text-neutral-light mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Bookings Yet</h3>
                        <p className="text-neutral-medium mb-6">You haven't booked any tee times yet</p>
                        <Button onClick={() => navigate("/tee-times")}>Find Tee Times</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Host Bookings Tab */}
              {user?.isHost && (
                <TabsContent value="host-bookings">
                  <Card>
                    <CardHeader>
                      <CardTitle>Bookings for Your Tee Times</CardTitle>
                      <CardDescription>
                        Manage bookings made by guests for your tee times
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingHostBookings ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : hostBookings && hostBookings.length > 0 ? (
                        <div className="space-y-6">
                          {hostBookings.map((booking: any) => (
                            <div key={booking.id} className="border rounded-lg p-4">
                              <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-lg">{booking.tee_time_listings?.clubs?.name}</h3>
                                  </div>
                                  
                                  <div className="mt-4 space-y-2">
                                    <div className="flex items-center">
                                      <CalendarDays className="h-4 w-4 text-primary mr-2" />
                                      <span>{formatDate(booking.tee_time_listings?.date)}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <Clock className="h-4 w-4 text-primary mr-2" />
                                      <span>{formatTime(booking.tee_time_listings?.date)}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <Users className="h-4 w-4 text-primary mr-2" />
                                      <span>{booking.number_of_players} player{booking.number_of_players > 1 ? 's' : ''}</span>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex items-center">
                                    <div className="flex-shrink-0 mr-3">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={booking.guest?.profile_image_url} />
                                        <AvatarFallback className="bg-primary text-primary-foreground">
                                          {booking.guest?.first_name?.[0] || booking.guest?.username?.[0] || "G"}
                                          {booking.guest?.last_name?.[0] || booking.guest?.username?.[1] || ""}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">
                                        Booked by {
                                          booking.guest?.first_name && booking.guest?.last_name
                                            ? `${booking.guest.first_name} ${booking.guest.last_name}`
                                            : booking.guest?.username || "Guest"
                                        }
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col justify-between">
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-primary">${parseFloat(booking.total_price).toFixed(2)}</p>
                                    <p className="text-sm text-neutral-medium">
                                      ${parseFloat(booking.tee_time_listings?.price || (booking.total_price / booking.number_of_players)).toFixed(2)} per player
                                    </p>
                                  </div>

                                  <div className="mt-4 space-y-2">
                                    <Link href={`/messages/${booking.guest?.id}`}>
                                      <Button variant="outline" className="w-full">
                                        <MessageSquare className="mr-2 h-4 w-4" /> Message Guest
                                      </Button>
                                    </Link>
                                    
                                    {booking.status === 'confirmed' && (
                                      <Button 
                                        className="w-full"
                                        onClick={() => openDialog(booking, 'complete')}
                                      >
                                        <CheckCircle className="mr-2 h-4 w-4" /> Mark as Completed
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Users className="h-12 w-12 mx-auto text-neutral-light mb-4" />
                          <h3 className="text-lg font-medium mb-2">No Bookings Yet</h3>
                          <p className="text-neutral-medium mb-6">You don't have any bookings for your tee times yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* My Listings Tab */}
              {user?.isHost && (
                <TabsContent value="listings">
                  <div className="space-y-6">
                    {/* Calendar view */}
                    <HostCalendar teeTimeListings={hostTeeTimeListings} />
                    
                    {/* Traditional list view */}
                    <Card>
                      <CardHeader>
                        <CardTitle>My Tee Time Listings</CardTitle>
                        <CardDescription>
                          View and manage all your tee time listings
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingTeeTimeListings ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        ) : teeTimeListingsError ? (
                          <div className="text-center py-12">
                            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                            <h3 className="text-lg font-medium mb-2">Failed to load listings</h3>
                            <p className="text-neutral-medium mb-6">Unable to fetch your tee time listings</p>
                            <Button onClick={() => window.location.reload()}>
                              Try Again
                            </Button>
                          </div>
                        ) : hostTeeTimeListings && hostTeeTimeListings.length > 0 ? (
                          <div className="space-y-6">
                            {hostTeeTimeListings.map((teeTime: TeeTimeListing) => (
                              <div key={teeTime.id} className="border rounded-lg p-4">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                      <h3 className="font-bold text-lg flex items-center">
                                        <Building className="h-5 w-5 mr-2 text-primary" />
                                        {teeTime.clubs?.name}
                                      </h3>
                                    </div>
                                    
                                    {teeTime.clubs?.location && (
                                      <p className="text-neutral-medium flex items-center mb-3">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        {teeTime.clubs.location}
                                      </p>
                                    )}
                                    
                                    <div className="space-y-2">
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
                                        <span>Up to {teeTime.players_allowed} players</span>
                                      </div>
                                    </div>

                                    {teeTime.notes && (
                                      <div className="mt-3 p-3 bg-neutral-50 rounded-lg">
                                        <p className="text-sm text-neutral-600">{teeTime.notes}</p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-col justify-between">
                                    <div className="text-right">
                                      <p className="text-lg font-bold text-primary">${teeTime.price}</p>
                                      <p className="text-sm text-neutral-medium">per player</p>
                                      <p className="text-xs text-neutral-medium mt-1">
                                        Created {formatDate(teeTime.created_at)}
                                      </p>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                      <Button 
                                        variant="outline" 
                                        className="w-full"
                                        onClick={() => handleEditListing(teeTime.id)}
                                        disabled={isCancellingListing}
                                      >
                                        <Edit2 className="mr-2 h-4 w-4" /> Edit
                                      </Button>
                                      
                                      {(teeTime.status === 'available' || teeTime.status === 'booked') && (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button 
                                              variant="outline" 
                                              className="w-full text-destructive hover:text-destructive"
                                              disabled={isCancellingListing}
                                            >
                                              {isCancellingListing ? (
                                                <>
                                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                  Cancelling...
                                                </>
                                              ) : (
                                                "Cancel"
                                              )}
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Cancel Tee Time Listing</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to cancel this tee time listing? This action cannot be undone.
                                                {teeTime.status === 'booked' && (
                                                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                                    <p className="text-sm text-yellow-800">
                                                      <strong>Warning:</strong> This listing has active bookings. Cancelling will affect existing reservations.
                                                    </p>
                                                  </div>
                                                )}
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <div className="py-4">
                                              <div className="space-y-2">
                                                <p><strong>Club:</strong> {teeTime.clubs?.name}</p>
                                                <p><strong>Date:</strong> {formatDate(teeTime.date)}</p>
                                                <p><strong>Time:</strong> {formatTime(teeTime.date)}</p>
                                                <p><strong>Price:</strong> ${teeTime.price} per player</p>
                                              </div>
                                            </div>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel disabled={isCancellingListing}>
                                                Keep Listing
                                              </AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => handleCancelListing(teeTime.id)}
                                                disabled={isCancellingListing}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              >
                                                {isCancellingListing ? (
                                                  <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Cancelling...
                                                  </>
                                                ) : (
                                                  "Yes, Cancel Listing"
                                                )}
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Volleyball className="h-12 w-12 mx-auto text-neutral-light mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Listings Yet</h3>
                            <p className="text-neutral-medium mb-6">You haven't created any tee time listings yet</p>
                            <Button onClick={() => navigate("/create-listing")}>
                              <Volleyball className="mr-2 h-4 w-4" />
                              Create Your First Listing
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'cancel' 
                ? 'Cancel Booking' 
                : 'Complete Booking'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'cancel'
                ? 'Are you sure you want to cancel this booking? This action cannot be undone.'
                : 'Mark this booking as completed? This will release the payment to the host after 24 hours.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedBooking && (
              <div className="space-y-2">
                <p><strong>Club:</strong> {selectedBooking.club?.name || selectedBooking.teeTime?.club?.name}</p>
                <p><strong>Date:</strong> {formatDate(selectedBooking.teeTime?.date)}</p>
                <p><strong>Time:</strong> {formatTime(selectedBooking.teeTime?.date)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button 
              variant={dialogAction === 'cancel' ? "destructive" : "default"}
              onClick={() => handleUpdateBookingStatus(
                selectedBooking, 
                dialogAction === 'cancel' ? 'cancelled' : 'completed'
              )}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus 
                ? "Processing..." 
                : dialogAction === 'cancel' 
                  ? "Yes, Cancel Booking" 
                  : "Yes, Mark as Completed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}