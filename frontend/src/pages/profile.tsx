import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { useHostTeeTimeListings } from "@/hooks/use-tee-times";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import TeeTimeCard from "@/components/listings/tee-time-card";
import { Calendar, Edit, MessageSquare, Star, MapPin, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Helmet } from 'react-helmet';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id);
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const isOwnProfile = isAuthenticated && user?.id === userId;
  const [activeTab, setActiveTab] = useState("about");
  const [location] = useLocation();
  
  // Force refetch on navigation mount - this ensures fresh data when coming back from edit page
  useEffect(() => {
    // Force profile data to be considered stale when component mounts
    // Similar to how GitHub, LinkedIn, Twitter handle profile reloads
    queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
  }, [userId, location]);
  
  // Manual refresh button handler
  const handleManualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
    toast({
      title: "Profile refreshed",
      description: "The latest profile data has been loaded.",
    });
  };

  // Fetch user profile data with cache-busting timestamp
  const { data: profileUser, isLoading, error } = useQuery({
    queryKey: [`/api/users/${userId}`],
    queryFn: async ({ queryKey }) => {
      // Add cache-busting timestamp to prevent browser caching
      const timestamp = Date.now();
      const response = await fetch(`${queryKey[0]}?_t=${timestamp}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      const data = await response.json();
      return data;
    },
    enabled: !isNaN(userId), // Only run query if we have a valid userId
    retry: 2,
    // Set shorter staleTime and refetchOnWindowFocus to ensure fresh data
    staleTime: 10 * 1000, // 10 seconds - like GitHub, LinkedIn, etc.
    refetchOnWindowFocus: true,
  });
  
  // Log debug information
  console.log("Profile page debug:", { 
    userId, 
    profileUser, 
    isLoading, 
    error: error ? (error as Error).message : null 
  });

  // Fetch user clubs if the user is a host
  const { data: userClubs = [] } = useQuery({
    queryKey: [`/api/users/${userId}/clubs`],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/clubs`);
      if (!response.ok) {
        throw new Error("Failed to fetch user clubs");
      }
      return response.json();
    },
    enabled: !!profileUser?.isHost,
  });

  // Fetch user's tee time listings if they are a host
  const { data: teeTimeListings = [] } = useHostTeeTimeListings(
    profileUser?.isHost ? userId : undefined
  );

  // Fetch reviews about the user
  const { data: reviews = [] } = useQuery({
    queryKey: [`/api/reviews/target/${userId}/${profileUser?.isHost ? 'host' : 'guest'}`],
    queryFn: async () => {
      const response = await fetch(`/api/reviews/target/${userId}/${profileUser?.isHost ? 'host' : 'guest'}`);
      if (!response.ok) {
        throw new Error("Failed to fetch reviews");
      }
      return response.json();
    },
    enabled: !!profileUser,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-neutral-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-2xl font-bold text-neutral-dark">User not found</h1>
          <p className="mt-2 text-neutral-medium">The user you're looking for doesn't exist or is unavailable.</p>
        </div>
      </div>
    );
  }

  const fullName = profileUser.firstName && profileUser.lastName 
    ? `${profileUser.firstName} ${profileUser.lastName}` 
    : profileUser.username;
  
  const getInitials = () => {
    if (profileUser.firstName && profileUser.lastName) {
      return `${profileUser.firstName[0]}${profileUser.lastName[0]}`;
    }
    return profileUser.username.substring(0, 2).toUpperCase();
  };

  const averageRating = reviews.length 
    ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1)
    : "N/A";

  const handleMessageClick = () => {
    if (!isAuthenticated) {
      openAuthModal("login");
    }
  };

  return (
    <>
      <Helmet>
        <title>{fullName} | Linx Profile</title>
        <meta name="description" content={`View ${fullName}'s profile on Linx. ${profileUser.isHost ? 'Book tee times with this host' : 'Connect with this golfer'}. Check reviews and availability.`} />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile sidebar */}
          <div className="md:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={profileUser.profileImage} alt={fullName} />
                    <AvatarFallback className="bg-primary text-white text-xl">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h1 className="text-2xl font-bold text-center">{fullName}</h1>
                  
                  <div className="flex items-center mt-1 mb-2">
                    {profileUser.isHost && (
                      <Badge className="mr-2 bg-green-100 text-primary hover:bg-green-200">
                        Host
                      </Badge>
                    )}
                    
                    {reviews.length > 0 && (
                      <div className="flex items-center text-sm">
                        <Star className="text-yellow-400 h-4 w-4 mr-1" />
                        <span>{averageRating}</span>
                        <span className="text-neutral-medium ml-1">({reviews.length})</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-neutral-medium text-center mb-4">
                    Member since {formatDate(new Date(profileUser.createdAt), { month: 'long', year: 'numeric' })}
                  </p>
                  
                  {!isOwnProfile && isAuthenticated ? (
                    <Button className="w-full mb-2" asChild>
                      <Link href={`/messages/${userId}`}>
                        <MessageSquare className="mr-2 h-4 w-4" /> Message
                      </Link>
                    </Button>
                  ) : !isOwnProfile && (
                    <Button onClick={handleMessageClick} className="w-full mb-2">
                      <MessageSquare className="mr-2 h-4 w-4" /> Message
                    </Button>
                  )}

                  {isOwnProfile && (
                    <Button variant="outline" className="w-full mb-2" asChild>
                      <Link href="/profile-edit">
                        <Edit className="mr-2 h-4 w-4" /> Edit Profile
                      </Link>
                    </Button>
                  )}
                </div>

                <Separator className="my-6" />

                {profileUser.bio && (
                  <div className="mb-6">
                    <h2 className="font-semibold mb-2">About</h2>
                    <p className="text-neutral-medium">{profileUser.bio}</p>
                  </div>
                )}

                {profileUser.isHost && userClubs.length > 0 && (
                  <div>
                    <h2 className="font-semibold mb-2">Member of</h2>
                    <ul className="space-y-2">
                      {userClubs.map((userClub) => (
                        <li key={userClub.id} className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white mr-2">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{userClub.club.name}</p>
                            <p className="text-xs text-neutral-medium">
                              Member since {formatDate(userClub.memberSince, { month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profile main content */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="flex items-center justify-between mb-4">
                    <TabsList>
                      <TabsTrigger value="about">Reviews</TabsTrigger>
                      {profileUser.isHost && (
                        <TabsTrigger value="listings">Tee Time Listings</TabsTrigger>
                      )}
                    </TabsList>
                    
                    {isOwnProfile && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleManualRefresh}
                        className="flex items-center gap-1 text-xs ml-4"
                      >
                        <RefreshCw className="h-3 w-3" /> Refresh
                      </Button>
                    )}
                  </div>
                  
                  <TabsContent value="about">
                    <h2 className="text-xl font-bold mb-6">Reviews</h2>
                    {reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <Card key={review.id}>
                            <CardContent className="pt-6">
                              <div className="flex items-start">
                                <Avatar className="h-10 w-10 mr-3">
                                  <AvatarImage src={review.reviewer?.profileImage} alt={review.reviewer?.username} />
                                  <AvatarFallback className="bg-primary text-white">
                                    {review.reviewer?.firstName?.[0]}
                                    {review.reviewer?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">
                                        {review.reviewer?.firstName} {review.reviewer?.lastName}
                                      </p>
                                      <p className="text-xs text-neutral-medium">
                                        {formatDate(review.createdAt)}
                                      </p>
                                    </div>
                                    <div className="flex text-yellow-400">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400" : ""}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="mt-2 text-neutral-medium">{review.comment}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 mx-auto text-neutral-light mb-2" />
                        <h3 className="text-lg font-medium">No Reviews Yet</h3>
                        <p className="text-neutral-medium">
                          {isOwnProfile
                            ? "You haven't received any reviews yet."
                            : `${profileUser.firstName || profileUser.username} hasn't received any reviews yet.`}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {profileUser.isHost && (
                    <TabsContent value="listings">
                      <h2 className="text-xl font-bold mb-6">Tee Time Listings</h2>
                      {teeTimeListings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {teeTimeListings.map((teeTime) => (
                            <TeeTimeCard
                              key={teeTime.id}
                              id={teeTime.id}
                              clubName={teeTime.club?.name || "Unknown Club"}
                              clubLocation={teeTime.club?.location || "Unknown Location"}
                              clubImageUrl={teeTime.club?.imageUrl || ""}
                              hostName={fullName}
                              hostImageUrl={profileUser.profileImage}
                              hostInitials={getInitials()}
                              hostMemberSince="Member for 5+ years"
                              date={teeTime.date}
                              price={teeTime.price}
                              rating={averageRating !== "N/A" ? parseFloat(averageRating) : 0}
                              reviewCount={reviews.length || 0}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 mx-auto text-neutral-light mb-2" />
                          <h3 className="text-lg font-medium">No Tee Times Available</h3>
                          <p className="text-neutral-medium">
                            {isOwnProfile
                              ? "You haven't listed any tee times yet."
                              : `${profileUser.firstName || profileUser.username} doesn't have any tee times available.`}
                          </p>
                          {isOwnProfile && (
                            <Button className="mt-4" asChild>
                              <Link href="/create-listing">
                                Create a Listing
                              </Link>
                            </Button>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
