import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useUserClubs, useHostTeeTimeListingsSupabase, type UserClub, type TeeTimeListing } from "@/hooks/use-profile";
import { queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import TeeTimeCard from "@/components/listings/tee-time-card";
import { Calendar, Edit, MessageSquare, Star, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Helmet } from 'react-helmet';

// Interface for raw Supabase profile data (snake_case)
interface SupabaseProfile {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  profile_image_url?: string;
  is_host: boolean;
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
}


// Interface for reviews from Supabase
interface Review {
  id: string;
  reviewer_id: string;
  target_id: string;
  target_type: 'host' | 'guest' | 'club';
  rating: number;
  comment?: string;
  created_at: string;
  reviewer?: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
  };
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const userId = id; // Keep as string since Supabase uses UUIDs
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { toast } = useToast();
  const isOwnProfile = user?.id === userId; // Check if this is the user's own profile (regardless of auth state)
  const [activeTab, setActiveTab] = useState("reviews");
  
  // Fetch user profile data using Supabase
  const { data: profileUser, isLoading, error } = useQuery<SupabaseProfile>({
    queryKey: [
      'supabase:profiles:single',
      { id: userId }
    ],
    enabled: !!userId && (isAuthenticated || !isOwnProfile), // Don't fetch if viewing own profile while logged out
    retry: 1, // Reduce retries to avoid cascading 406 errors
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false, // Disable refetch on focus to prevent 406 errors
  });

  // Fetch user clubs if the user is a host
  const { data: userClubs = [] } = useUserClubs(userId, !!profileUser?.is_host && !!userId);

  // Fetch user's tee time listings if they are a host
  const { data: teeTimeListings = [] } = useHostTeeTimeListingsSupabase(userId, !!profileUser?.is_host && !!userId);

  // Fetch reviews about the user
  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: [
      'supabase:reviews:select',
      {
        columns: `
          *,
          reviewer:reviewer_id (
            id,
            username,
            first_name,
            last_name,
            profile_image_url
          )
        `,
        eq: { 
          target_id: userId, 
          target_type: profileUser?.is_host ? 'host' : 'guest' 
        },
        order: { column: 'created_at', ascending: false }
      }
    ],
    enabled: !!profileUser && !!userId,
  });

  // Redirect to home if user is trying to view their own profile while logged out
  if (!isAuthenticated && isOwnProfile) {
    window.location.href = '/';
    return null;
  }

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

  if (error || !profileUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-2xl font-bold text-neutral-dark">User not found</h1>
          <p className="mt-2 text-neutral-medium">The user you're looking for doesn't exist or is unavailable.</p>
        </div>
      </div>
    );
  }

  const fullName = profileUser.first_name && profileUser.last_name 
    ? `${profileUser.first_name} ${profileUser.last_name}` 
    : profileUser.username;
  
  const getInitials = () => {
    if (profileUser.first_name && profileUser.last_name) {
      return `${profileUser.first_name[0]}${profileUser.last_name[0]}`;
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
        <title>{fullName} | ClubKey Profile</title>
        <meta name="description" content={`View ${fullName}'s profile on ClubKey. ${profileUser.is_host ? 'Book tee times with this host' : 'Connect with this golfer'}. Check reviews and availability.`} />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile sidebar */}
          <div className="md:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={profileUser.profile_image_url} alt={fullName} />
                    <AvatarFallback className="bg-primary text-white text-xl">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h1 className="text-2xl font-bold text-center">{fullName}</h1>
                  
                  <div className="flex items-center mt-1 mb-2">
                    {profileUser.is_host && (
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
                    Member since {formatDate(new Date(profileUser.created_at), { month: 'long', year: 'numeric' })}
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

                  {isAuthenticated && isOwnProfile && (
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

                {profileUser.is_host && userClubs.length > 0 && (
                  <div>
                    <h2 className="font-semibold mb-2">Member of</h2>
                    <ul className="space-y-2">
                      {userClubs.map((userClub) => (
                        <li key={userClub.id} className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white mr-2">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{userClub.clubs.name}</p>
                            <p className="text-xs text-neutral-medium">
                              Member since {formatDate(userClub.member_since, { month: 'long', year: 'numeric' })}
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
                      <TabsTrigger value="reviews">Reviews</TabsTrigger>
                      {profileUser.is_host && (
                        <TabsTrigger value="listings">Tee Time Listings</TabsTrigger>
                      )}
                    </TabsList>
                  </div>
                  
                  <TabsContent value="reviews">
                    <h2 className="text-xl font-bold mb-6">Reviews</h2>
                    {reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <Card key={review.id}>
                            <CardContent className="pt-6">
                              <div className="flex items-start">
                                <Avatar className="h-10 w-10 mr-3">
                                  <AvatarImage src={review.reviewer?.profile_image_url} alt={review.reviewer?.username} />
                                  <AvatarFallback className="bg-primary text-white">
                                    {review.reviewer?.first_name?.[0]}
                                    {review.reviewer?.last_name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">
                                        {review.reviewer?.first_name} {review.reviewer?.last_name}
                                      </p>
                                      <p className="text-xs text-neutral-medium">
                                        {formatDate(review.created_at)}
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
                            : `${profileUser.first_name || profileUser.username} hasn't received any reviews yet.`}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {profileUser.is_host && (
                    <TabsContent value="listings">
                      <h2 className="text-xl font-bold mb-6">Tee Time Listings</h2>
                      {teeTimeListings.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {teeTimeListings.map((teeTime) => {
                            // Convert string UUID to number for legacy TeeTimeCard component
                            const numericId = parseInt(teeTime.id, 10) || 0;
                            const clubName = teeTime.clubs?.name || "Unknown Club";
                            const clubLocation = teeTime.clubs?.location || "Unknown Location";
                            const clubImageUrl = teeTime.clubs?.image_url || "";
                            const hostImageUrl = profileUser.profile_image_url || "";
                            
                            return (
                              <TeeTimeCard
                                key={teeTime.id}
                                id={numericId}
                                clubName={clubName}
                                clubLocation={clubLocation}
                                clubImageUrl={clubImageUrl}
                                hostName={fullName}
                                hostImageUrl={hostImageUrl}
                                hostInitials={getInitials()}
                                date={teeTime.date}
                                price={teeTime.price}
                                rating={averageRating !== "N/A" ? parseFloat(averageRating) : 0}
                                reviewCount={reviews.length || 0}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 mx-auto text-neutral-light mb-2" />
                          <h3 className="text-lg font-medium">No Tee Times Available</h3>
                          <p className="text-neutral-medium">
                            {isOwnProfile
                              ? "You haven't listed any tee times yet."
                              : `${profileUser.first_name || profileUser.username} doesn't have any tee times available.`}
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
