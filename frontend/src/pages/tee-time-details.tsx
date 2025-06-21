import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTeeTimeListing } from "@/hooks/use-tee-times";
import { useAuthStore } from "@/stores/authStore";
import { useBookTeeTime } from "@/hooks/use-tee-times";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, Clock, MapPin, Users, Star, MessageSquare, 
  AlertCircle, ChevronLeft, Check, Shield, Info, ArrowRight
} from "lucide-react";
import { formatDate, formatTime, formatPrice, getInitials } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from 'react-helmet';

export default function TeeTimeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const teeTimeId = parseInt(id);
  const [, navigate] = useLocation();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { toast } = useToast();
  const [playerCount, setPlayerCount] = useState("1");
  
  console.log('🔍 [TeeTimeDetailsPage] Component rendered with params:', { id, teeTimeId });
  console.log('🔍 [TeeTimeDetailsPage] ID type:', typeof id, 'parsed ID:', teeTimeId, 'isNaN:', isNaN(teeTimeId));
  
  const { data: teeTime, isLoading, error } = useTeeTimeListing(teeTimeId);
  const { mutate: bookTeeTime, isPending: isBooking } = useBookTeeTime();
  
  console.log('🔍 [TeeTimeDetailsPage] Query state:', { teeTime, isLoading, error });

  const handleBookNow = () => {
    console.log('🔍 [handleBookNow] Button clicked', { isAuthenticated, user: user?.id, teeTime: teeTime?.id });
    
    if (!isAuthenticated) {
      console.log('🔍 [handleBookNow] Not authenticated, opening auth modal');
      openAuthModal("login");
      return;
    }
    
    // Can't book your own tee time
    if (user && teeTime && user.id === teeTime.host_id) {
      console.log('🔍 [handleBookNow] Cannot book own tee time');
      toast({
        title: "Cannot book your own tee time",
        description: "You cannot book a tee time that you are hosting.",
        variant: "destructive",
      });
      return;
    }
    
    if (teeTime && user) {
      // Check if tee time is available
      if (teeTime.status !== 'available') {
        toast({
          title: "Tee time unavailable",
          description: "This tee time is no longer available for booking.",
          variant: "destructive",
        });
        return;
      }
      
      // Check for valid player count
      if (!playerCount || parseInt(playerCount) < 1 || parseInt(playerCount) > teeTime.players_allowed) {
        toast({
          title: "Invalid player count",
          description: `Please select between 1 and ${teeTime.players_allowed} players.`,
          variant: "destructive",
        });
        return;
      }
      
      // Store booking information in localStorage temporarily
      const bookingInfo = {
        teeTimeId: teeTime.id,
        guestId: user.id, // UUID from Supabase auth
        numberOfPlayers: parseInt(playerCount),
        totalPrice: teeTime.price * parseInt(playerCount),
      };
      
      console.log('🔍 [handleBookNow] Storing booking info:', bookingInfo);
      localStorage.setItem('pendingBookingInfo', JSON.stringify(bookingInfo));
      
      // Navigate to pre-checkout page for booking confirmation
      console.log('🔍 [handleBookNow] Navigating to pre-checkout:', `/pre-checkout/${teeTime.id}`);
      navigate(`/pre-checkout/${teeTime.id}`);
    }
  };

  const handleContactHost = () => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }
    
    if (teeTime?.host?.id) {
      navigate(`/messages/${teeTime.host.id}`);
    }
  };

  const getHostInitials = () => {
    if (teeTime?.host?.first_name && teeTime?.host?.last_name) {
      return `${teeTime.host.first_name[0]}${teeTime.host.last_name[0]}`;
    }
    if (teeTime?.host?.username) {
      return teeTime.host.username.substring(0, 2).toUpperCase();
    }
    return "";
  };
  
  const hostName = teeTime?.host?.first_name && teeTime?.host?.last_name
    ? `${teeTime.host.first_name} ${teeTime.host.last_name}`
    : teeTime?.host?.username || "";

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !teeTime) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-neutral-dark">Tee Time Not Found</h1>
          <p className="mt-2 text-neutral-medium">The tee time you're looking for doesn't exist or is no longer available.</p>
          <Button className="mt-6" onClick={() => navigate("/tee-times")}>
            Browse Other Tee Times
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Helmet>
        <title>{teeTime.clubs?.name} Tee Time | ClubKey</title>
        <meta name="description" content={`Book a tee time at ${teeTime.clubs?.name} hosted by ${hostName}. ${teeTime.clubs?.location}. Available on ${formatDate(new Date(teeTime.date), {month: 'long', day: 'numeric', year: 'numeric'})} at ${formatTime(new Date(teeTime.date))}.`} />
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        {/* Back button */}
        <div className="mb-4">
          <Button 
            variant="ghost" 
            className="text-sm pl-0 hover:bg-transparent hover:text-primary"
            onClick={() => navigate("/tee-times")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Tee Times
          </Button>
        </div>
        
        {/* Main content layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Images and details */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge className="bg-primary">{formatDate(new Date(teeTime.date), {weekday: 'short', month: 'short', day: 'numeric'})}</Badge>
                <Badge variant="outline">{formatTime(new Date(teeTime.date))}</Badge>
                {teeTime.status === "available" && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Check className="h-3 w-3 mr-1" /> Available
                  </Badge>
                )}
              </div>
              
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-neutral-dark">
                {teeTime.clubs?.name}
              </h1>
              
              <div className="flex items-center text-neutral-medium mt-1">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{teeTime.clubs?.location}</span>
                <span className="mx-2">•</span>
                <div className="flex items-center">
                  <Star className="text-yellow-400 mr-1 h-4 w-4" />
                  <span className="font-medium">{(teeTime.host_rating || 0).toFixed(1)}</span>
                  <span className="ml-1">({teeTime.review_count || 0} reviews)</span>
                </div>
              </div>
            </div>
            
            {/* Club Image */}
            <div className="rounded-lg overflow-hidden h-[300px] mb-6 shadow-md">
              <img
                src={teeTime.clubs?.image_url || "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800"}
                alt={teeTime.clubs?.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Tabbed content for details */}
            <Tabs defaultValue="details" className="mb-8">
              <TabsList className="mb-6">
                <TabsTrigger value="details">Tee Time Details</TabsTrigger>
                <TabsTrigger value="host">Host Info</TabsTrigger>
                <TabsTrigger value="course">About the Course</TabsTrigger>
              </TabsList>
              
              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3 shadow-sm border">
                    <div className="flex items-center mb-1">
                      <Calendar className="h-4 w-4 text-primary mr-1.5" />
                      <p className="text-sm font-medium">Date</p>
                    </div>
                    <p className="text-neutral-medium text-sm">{formatDate(new Date(teeTime.date), {weekday: 'long', month: 'short', day: 'numeric'})}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 shadow-sm border">
                    <div className="flex items-center mb-1">
                      <Clock className="h-4 w-4 text-primary mr-1.5" />
                      <p className="text-sm font-medium">Time</p>
                    </div>
                    <p className="text-neutral-medium text-sm">{formatTime(new Date(teeTime.date))}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 shadow-sm border">
                    <div className="flex items-center mb-1">
                      <Users className="h-4 w-4 text-primary mr-1.5" />
                      <p className="text-sm font-medium">Players</p>
                    </div>
                    <p className="text-neutral-medium text-sm">Up to {teeTime.players_allowed} players</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 shadow-sm border">
                    <div className="flex items-center mb-1">
                      <MapPin className="h-4 w-4 text-primary mr-1.5" />
                      <p className="text-sm font-medium">Course</p>
                    </div>
                    <p className="text-neutral-medium text-sm">18 holes, Par 72</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">About This Tee Time</h3>
                  <p className="text-neutral-medium">
                    {teeTime.notes || `Experience the magnificent ${teeTime.clubs?.name} golf course, normally accessible only to members. This exclusive tee time is hosted by a verified club member, giving you the opportunity to play at one of the area's most prestigious courses.`}
                  </p>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">Additional Information</h4>
                      <ul className="mt-2 space-y-1 text-sm text-blue-700">
                        <li>• Golf cart included with your booking</li>
                        <li>• Please arrive 30 minutes before your tee time</li>
                        <li>• Dress code: Collared shirt, no denim, appropriate golf attire</li>
                        <li>• Cancellations must be made 24 hours in advance for a full refund</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Host Tab */}
              <TabsContent value="host">
                <div className="flex items-start mb-6">
                  <Avatar className="h-16 w-16 mr-4 border-2 border-white shadow-md">
                    <AvatarImage src={teeTime.host?.profileImage} alt={hostName} />
                    <AvatarFallback className="bg-primary text-white text-lg">
                      {getHostInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium">{hostName}</h3>
                      <Badge className="ml-2 bg-green-100 text-primary hover:bg-green-200">
                        Host
                      </Badge>
                    </div>
                    {/* Removed member since text */}
                    <div className="flex items-center">
                      <Star className="text-yellow-400 mr-1 h-4 w-4" />
                      <span className="font-medium">{teeTime.hostRating?.toFixed(1) || "New"}</span>
                      {teeTime.reviewCount > 0 && (
                        <span className="text-neutral-medium ml-1">({teeTime.reviewCount} reviews)</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <h4 className="font-medium mb-2">Host Verification</h4>
                    <div className="space-y-2">
                      {teeTime.host?.identityVerified && (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm">Identity verified</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm">Club membership verified</span>
                      </div>
                      {teeTime.host?.emailVerified && (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm">Email verified</span>
                        </div>
                      )}
                      {teeTime.host?.phoneVerified && (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm">Phone verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <h4 className="font-medium mb-2">Response Rate</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Response rate</span>
                          <span className="font-medium">
                            {teeTime.host?.responseRate ? `${teeTime.host.responseRate}%` : "New host"}
                          </span>
                        </div>
                        <Progress 
                          value={teeTime.host?.responseRate || 90} 
                          className="h-2" 
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Response time</span>
                          <span className="font-medium">
                            {teeTime.host?.responseTime || "Typically within a few hours"}
                          </span>
                        </div>
                        <Progress value={80} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full md:w-auto"
                  onClick={handleContactHost}
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Contact Host
                </Button>
              </TabsContent>
              
              {/* Course Tab */}
              <TabsContent value="course">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">About {teeTime.clubs?.name}</h3>
                    <p className="text-neutral-medium">
                      {teeTime.clubs?.description || `${teeTime.clubs?.name} is a prestigious golf club offering exquisite views and a challenging course. Known for its impeccable greens and strategic layout, this club provides an exceptional golfing experience in ${teeTime.clubs?.location}.`}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <h4 className="font-medium mb-3">Course Details</h4>
                      <div className="space-y-2 text-sm">
                        {teeTime.clubs?.courseType && (
                        <div className="flex justify-between">
                          <span className="text-neutral-medium">Type</span>
                          <span className="font-medium">{teeTime.club.courseType || "18-hole"}</span>
                        </div>
                      )}
                      {teeTime.clubs?.coursePar && (
                        <div className="flex justify-between">
                          <span className="text-neutral-medium">Par</span>
                          <span className="font-medium">{teeTime.club.coursePar || "72"}</span>
                        </div>
                      )}
                      {teeTime.clubs?.courseLength && (
                        <div className="flex justify-between">
                          <span className="text-neutral-medium">Length</span>
                          <span className="font-medium">{teeTime.club.courseLength}</span>
                        </div>
                      )}
                      {teeTime.clubs?.courseRating && (
                        <div className="flex justify-between">
                          <span className="text-neutral-medium">Rating</span>
                          <span className="font-medium">{teeTime.club.courseRating}</span>
                        </div>
                      )}
                      {teeTime.clubs?.grassType && (
                        <div className="flex justify-between">
                          <span className="text-neutral-medium">Grass Type</span>
                          <span className="font-medium">{teeTime.club.grassType}</span>
                        </div>
                      )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <h4 className="font-medium mb-3">Amenities</h4>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        {teeTime.clubs?.amenities ? (
                          // If we have amenities from the API, use them
                          <>
                            {teeTime.club.amenities.split(',').map((amenity, index) => (
                              <div key={index} className="flex items-center">
                                <Check className="h-4 w-4 text-green-500 mr-2" />
                                <span>{amenity.trim()}</span>
                              </div>
                            ))}
                          </>
                        ) : (
                          // Default amenities if none are provided
                          <>
                            <div className="flex items-center">
                              <Check className="h-4 w-4 text-green-500 mr-2" />
                              <span>Golf Carts</span>
                            </div>
                            <div className="flex items-center">
                              <Check className="h-4 w-4 text-green-500 mr-2" />
                              <span>Practice Green</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right column - Booking card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-md border-2 border-gray-100">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-2xl font-bold text-primary">{formatPrice(teeTime.price)}</span>
                    <span className="text-neutral-medium font-normal text-sm ml-1">per player</span>
                  </div>
                  <Badge 
                    variant={teeTime.status === "available" ? "outline" : "secondary"}
                    className={teeTime.status === "available" 
                      ? "bg-green-50 text-green-700 border-green-200" 
                      : "bg-yellow-50 text-yellow-700 border-yellow-200"
                    }
                  >
                    {teeTime.status === "available" ? "Available" : "Limited Spots"}
                  </Badge>
                </div>
                
                <div className="flex items-center text-sm p-3 rounded-md bg-gray-50 border mb-4">
                  <Calendar className="h-4 w-4 mr-1.5 text-primary" />
                  <span>{formatDate(new Date(teeTime.date), {weekday: 'long', month: 'long', day: 'numeric'})}</span>
                  <span className="mx-1">•</span>
                  <Clock className="h-4 w-4 mr-1.5 text-primary" />
                  <span>{formatTime(new Date(teeTime.date))}</span>
                </div>

                <Separator className="mb-4" />

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Number of Players</label>
                    <Select 
                      value={playerCount} 
                      onValueChange={setPlayerCount}
                      disabled={isBooking}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select number of players" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(teeTime.players_allowed)].map((_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {i + 1} {i === 0 ? "player" : "players"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-3 space-y-2 border">
                    <div className="flex justify-between text-sm">
                      <span>{formatPrice(teeTime.price)} × {playerCount} {parseInt(playerCount) === 1 ? "player" : "players"}</span>
                      <span>{formatPrice(teeTime.price * parseInt(playerCount))}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(teeTime.price * parseInt(playerCount))}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90" 
                    disabled={isBooking || teeTime.status !== "available"}
                    onClick={handleBookNow}
                    size="lg"
                  >
                    {isBooking ? "Processing..." : (
                      <span className="flex items-center">
                        Book Now <ArrowRight className="ml-1 h-4 w-4" />
                      </span>
                    )}
                  </Button>
                  
                  <div className="flex items-center justify-center">
                    <Shield className="h-4 w-4 text-primary mr-1.5" />
                    <span className="text-xs text-center text-neutral-medium">
                      Secure booking. Pay only after confirmation.
                    </span>
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
