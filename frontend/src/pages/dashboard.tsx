import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserBookings, useHostBookings, useHostTeeTimeListings } from "@/hooks/use-tee-times";
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
import { useCreatePaymentIntent } from "@/hooks/use-tee-times";
import { formatDate, formatTime } from "@/lib/utils";
import { CalendarDays, CheckCircle, Clock, Edit2, Volleyball, MessageSquare, Star, Users } from "lucide-react";
import { Helmet } from 'react-helmet';
import HostCalendar from "@/components/dashboard/host-calendar";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'cancel' | 'complete'>('cancel');
  const { mutate: updateBookingStatus, isPending: isUpdatingStatus } = useUpdateBookingStatus();
  const { mutate: createPaymentIntent, isPending: isCreatingPayment } = useCreatePaymentIntent();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    openAuthModal("login");
    return null;
  }

  // Fetch data based on user role
  const { data: myBookings, isLoading: isLoadingBookings } = useUserBookings(user?.id);
  const { data: hostBookings, isLoading: isLoadingHostBookings } = useHostBookings(
    user?.isHost ? user.id : undefined
  );
  const { data: hostTeeTimeListings, isLoading: isLoadingTeeTimeListings } = useHostTeeTimeListings(
    user?.isHost ? user.id : undefined
  );

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
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Confirmed</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Helmet>
        <title>Dashboard | Linx</title>
        <meta name="description" content="Manage your tee time bookings, listings and account information. View your upcoming golf sessions and connect with hosts or guests." />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-neutral-dark">Dashboard</h1>
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

                {!user?.isHost && (
                  <div className="bg-secondary rounded-lg p-4 mb-6">
                    <h3 className="font-medium mb-2">Become a Host</h3>
                    <p className="text-sm text-neutral-medium mb-4">Share access to your club and earn income from your membership</p>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        // This would update the user to become a host
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : myBookings && myBookings.length > 0 ? (
                      <div className="space-y-6">
                        {myBookings.map((booking: any) => (
                          <div key={booking.id} className="border rounded-lg p-4">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-lg">{booking.club?.name || booking.teeTime?.club?.name}</h3>
                                  {getStatusBadge(booking.status)}
                                </div>
                                <p className="text-neutral-medium">{booking.club?.location || booking.teeTime?.club?.location}</p>
                                
                                <div className="mt-4 space-y-2">
                                  <div className="flex items-center">
                                    <CalendarDays className="h-4 w-4 text-primary mr-2" />
                                    <span>{formatDate(booking.teeTime?.date)}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 text-primary mr-2" />
                                    <span>{formatTime(booking.teeTime?.date)}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Users className="h-4 w-4 text-primary mr-2" />
                                    <span>{booking.numberOfPlayers} player{booking.numberOfPlayers > 1 ? 's' : ''}</span>
                                  </div>
                                </div>

                                <div className="mt-4 flex items-center">
                                  <div className="flex-shrink-0 mr-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={booking.host?.profileImage || booking.teeTime?.host?.profileImage} />
                                      <AvatarFallback className="bg-primary text-primary-foreground">
                                        {(booking.host?.firstName?.[0] || booking.teeTime?.host?.firstName?.[0] || "H")}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      Hosted by {booking.host?.firstName || booking.teeTime?.host?.firstName || booking.host?.username || booking.teeTime?.host?.username}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col justify-between">
                                <div className="text-right">
                                  <p className="text-lg font-bold text-primary">${booking.totalPrice}</p>
                                  <p className="text-sm text-neutral-medium">
                                    ${booking.teeTime?.price || (booking.totalPrice / booking.numberOfPlayers)} per player
                                  </p>
                                </div>

                                <div className="mt-4 space-y-2">
                                  <Link href={`/messages/${booking.teeTime?.hostId || booking.host?.id}`}>
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
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : hostBookings && hostBookings.length > 0 ? (
                        <div className="space-y-6">
                          {hostBookings.map((booking: any) => (
                            <div key={booking.id} className="border rounded-lg p-4">
                              <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-lg">{booking.teeTime?.club?.name}</h3>
                                    {getStatusBadge(booking.status)}
                                  </div>
                                  
                                  <div className="mt-4 space-y-2">
                                    <div className="flex items-center">
                                      <CalendarDays className="h-4 w-4 text-primary mr-2" />
                                      <span>{formatDate(booking.teeTime?.date)}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <Clock className="h-4 w-4 text-primary mr-2" />
                                      <span>{formatTime(booking.teeTime?.date)}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <Users className="h-4 w-4 text-primary mr-2" />
                                      <span>{booking.numberOfPlayers} player{booking.numberOfPlayers > 1 ? 's' : ''}</span>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex items-center">
                                    <div className="flex-shrink-0 mr-3">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={booking.guest?.profileImage} />
                                        <AvatarFallback className="bg-primary text-primary-foreground">
                                          {booking.guest?.firstName?.[0] || booking.guest?.username?.[0] || "G"}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">
                                        Booked by {booking.guest?.firstName || booking.guest?.username}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col justify-between">
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-primary">${booking.totalPrice}</p>
                                    <p className="text-sm text-neutral-medium">
                                      ${booking.teeTime?.price} per player
                                    </p>
                                  </div>

                                  <div className="mt-4 space-y-2">
                                    <Link href={`/messages/${booking.guestId}`}>
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
                    <HostCalendar />
                    
                    {/* Traditional list view */}
                    <Card>
                      <CardHeader>
                        <CardTitle>My Tee Time Listings</CardTitle>
                        <CardDescription>
                          View all your tee time listings in a list format
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoadingTeeTimeListings ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        ) : hostTeeTimeListings && hostTeeTimeListings.length > 0 ? (
                          <div className="space-y-6">
                            {hostTeeTimeListings.map((teeTime: any) => (
                              <div key={teeTime.id} className="border rounded-lg p-4">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                      <h3 className="font-bold text-lg">{teeTime.club?.name}</h3>
                                      <Badge 
                                        variant="outline"
                                        className={
                                          teeTime.status === 'available' 
                                            ? 'bg-green-50 text-green-700 border-green-200' 
                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                        }
                                      >
                                        {teeTime.status === 'available' ? 'Available' : 'Booked'}
                                      </Badge>
                                    </div>
                                    <p className="text-neutral-medium">{teeTime.club?.location}</p>
                                    
                                    <div className="mt-4 space-y-2">
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
                                        <span>Up to {teeTime.playersAllowed} players</span>
                                      </div>
                                    </div>
                                  </div>
  
                                  <div className="flex flex-col justify-between">
                                    <div className="text-right">
                                      <p className="text-lg font-bold text-primary">${teeTime.price}</p>
                                      <p className="text-sm text-neutral-medium">per player</p>
                                    </div>
  
                                    <div className="mt-4 space-y-2">
                                      <Button 
                                        variant="outline" 
                                        className="w-full"
                                        onClick={() => {
                                          // This would navigate to edit page
                                        toast({
                                          title: "Feature Coming Soon",
                                          description: "Editing listings will be available soon!"
                                        });
                                      }}
                                    >
                                      <Edit2 className="mr-2 h-4 w-4" /> Edit
                                    </Button>
                                    
                                    {teeTime.status === 'available' && (
                                      <Button 
                                        variant="outline" 
                                        className="w-full text-destructive hover:text-destructive"
                                        onClick={() => {
                                          // This would cancel/delete listing
                                          toast({
                                            title: "Feature Coming Soon",
                                            description: "Cancelling listings will be available soon!"
                                          });
                                        }}
                                      >
                                        Cancel
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
                            <Volleyball className="h-12 w-12 mx-auto text-neutral-light mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Listings Yet</h3>
                            <p className="text-neutral-medium mb-6">You haven't created any tee time listings yet</p>
                            <Button onClick={() => navigate("/create-listing")}>Create a Listing</Button>
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