import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTeeTimeListings, type TeeTimeListing } from "@/hooks/use-tee-times";
import { useAuthStore } from "@/stores/authStore";
import { Heart, Star } from "lucide-react";

export default function FeaturedTeeTimesSection() {
  const { isAuthenticated, openAuthModal } = useAuthStore();
  const { toast } = useToast();
  const { data: teeTimeListings, isLoading, error } = useTeeTimeListings();
  const [favoriteTeeTimes, setFavoriteTeeTimes] = useState<number[]>([]);
  
  // Only get the first 3 tee times for featured section
  const featuredTeeTimeListings = teeTimeListings?.slice(0, 3) || [];

  const toggleFavorite = (id: number) => {
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }

    if (favoriteTeeTimes.includes(id)) {
      setFavoriteTeeTimes(favoriteTeeTimes.filter(timeId => timeId !== id));
      toast({
        title: "Removed from favorites",
        description: "Tee time has been removed from your favorites",
      });
    } else {
      setFavoriteTeeTimes([...favoriteTeeTimes, id]);
      toast({
        title: "Added to favorites",
        description: "Tee time has been added to your favorites",
      });
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  };

  if (isLoading) {
    return (
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-heading font-bold text-neutral-dark">Featured Tee Times</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-white rounded-lg overflow-hidden shadow-md">
                <div className="h-48 w-full bg-gray-300 animate-pulse"></div>
                <CardContent className="p-4">
                  <div className="h-4 w-1/4 bg-gray-300 animate-pulse mb-2"></div>
                  <div className="h-6 w-2/3 bg-gray-300 animate-pulse mb-1"></div>
                  <div className="h-4 w-1/3 bg-gray-300 animate-pulse mb-3"></div>
                  <div className="flex items-center mb-3">
                    <div className="h-8 w-8 rounded-full bg-gray-300 animate-pulse mr-2"></div>
                    <div>
                      <div className="h-4 w-24 bg-gray-300 animate-pulse"></div>
                      <div className="h-3 w-32 bg-gray-300 animate-pulse mt-1"></div>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="h-4 w-32 bg-gray-300 animate-pulse"></div>
                        <div className="h-6 w-20 bg-gray-300 animate-pulse mt-1"></div>
                      </div>
                      <div className="h-10 w-24 bg-gray-300 animate-pulse rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !teeTimeListings) {
    return (
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-heading font-bold text-neutral-dark">Featured Tee Times</h2>
          </div>
          <div className="text-center py-8">
            <p className="text-neutral-medium">Unable to load tee times. Please try again later.</p>
          </div>
        </div>
      </section>
    );
  }

  if (featuredTeeTimeListings.length === 0) {
    return (
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-heading font-bold text-neutral-dark">Featured Tee Times</h2>
          </div>
          <div className="text-center py-8">
            <p className="text-neutral-medium">No featured tee times available at the moment.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-3">
          <h2 className="text-3xl font-heading font-bold text-neutral-dark mb-2 sm:mb-0">Featured Tee Times</h2>
          <Link href="/tee-times" className="text-primary font-medium hover:text-primary-dark transition-all">
            View all <span aria-hidden="true">→</span>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredTeeTimeListings.map((teeTime: TeeTimeListing) => (
            <Card key={teeTime.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all">
              <div className="h-48 w-full overflow-hidden relative">
                <img 
                  src={teeTime.club?.imageUrl || "https://images.unsplash.com/photo-1633710379064-ca8823aadce1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400&q=80"} 
                  alt={teeTime.club?.name} 
                  className="w-full h-full object-cover transition-all hover:scale-105"
                />
                <button
                  onClick={() => toggleFavorite(teeTime.id)}
                  className="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow"
                >
                  <Heart 
                    className={`${
                      favoriteTeeTimes.includes(teeTime.id) 
                        ? "fill-red-500 text-red-500" 
                        : "text-neutral-medium hover:text-primary"
                    } w-5 h-5`}
                  />
                </button>
              </div>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center mb-3">
                  <div className="text-sm text-primary font-medium bg-green-100 rounded px-2 py-0.5">
                    <Star className="inline-block mr-1 h-3 w-3" /> Member Host
                  </div>
                  <div className="ml-auto flex items-center text-sm">
                    <Star className="text-yellow-400 mr-1 h-4 w-4" />
                    <span className="font-medium">{teeTime.hostRating ? teeTime.hostRating.toFixed(1) : '0.0'}</span>
                    <span className="text-neutral-medium ml-1">({teeTime.reviewCount || 0})</span>
                  </div>
                </div>
                <h3 className="font-heading font-bold text-lg mb-2">{teeTime.club?.name}</h3>
                <p className="text-neutral-medium text-sm mb-3">
                  {teeTime.club?.location} • 18 holes
                </p>
                <div className="flex items-center mb-3">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage src={teeTime.host?.profileImage} alt={teeTime.host?.username} />
                    <AvatarFallback className="bg-primary text-white">
                      {teeTime.host?.firstName?.[0]}
                      {teeTime.host?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      Hosted by {teeTime.host?.firstName || teeTime.host?.username}
                    </p>
                    <p className="text-xs text-neutral-medium">Club Member for 5+ years</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <p className="text-sm text-neutral-medium mb-1">
                        {formatDate(teeTime.date)}
                      </p>
                      <p className="text-lg font-bold">
                        <span className="text-primary">${teeTime.price}</span>{" "}
                        <span className="text-sm font-normal text-neutral-medium">per player</span>
                      </p>
                    </div>
                    <Link href={`/tee-times/${teeTime.id}`}>
                      <Button className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-5 rounded transition-all">
                        Book Now
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
