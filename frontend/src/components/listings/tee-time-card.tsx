import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

export interface TeeTimeCardProps {
  id: number;
  clubName: string;
  clubLocation: string;
  clubImageUrl: string;
  hostName: string;
  hostImageUrl?: string;
  hostInitials: string;
  date: string;
  price: number;
  rating: number;
  reviewCount: number;
  isFavorited?: boolean;
  onFavoriteToggle?: (id: number) => void;
}

export default function TeeTimeCard({
  id,
  clubName,
  clubLocation,
  clubImageUrl,
  hostName,
  hostImageUrl,
  hostInitials,
  date,
  price,
  rating,
  reviewCount,
  isFavorited = false,
  onFavoriteToggle
}: TeeTimeCardProps) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const [favorite, setFavorite] = useState(isFavorited);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "EEEE, MMMM d • h:mm a");
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }

    setFavorite(!favorite);
    
    if (onFavoriteToggle) {
      onFavoriteToggle(id);
    } else {
      toast({
        title: favorite ? "Removed from favorites" : "Added to favorites",
        description: favorite 
          ? "Tee time has been removed from your favorites" 
          : "Tee time has been added to your favorites",
      });
    }
  };

  return (
    <Card className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all h-full">
      <div className="h-48 w-full overflow-hidden relative">
        <img 
          src={clubImageUrl || "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"} 
          alt={clubName} 
          className="w-full h-full object-cover transition-all hover:scale-105"
        />
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow"
        >
          <Heart 
            className={`${
              favorite ? "fill-red-500 text-red-500" : "text-neutral-medium hover:text-primary"
            } w-5 h-5`}
          />
        </button>
      </div>
      <CardContent className="p-4">
        <div className="flex items-center mb-2">
          <div className="text-sm text-primary font-medium bg-green-100 rounded px-2 py-0.5">
            <Star className="inline-block mr-1 h-3 w-3" /> Member Host
          </div>
          <div className="ml-auto flex items-center text-sm">
            <Star className="text-yellow-400 mr-1 h-4 w-4" />
            <span className="font-medium">{rating.toFixed(1)}</span>
            <span className="text-neutral-medium ml-1">({reviewCount})</span>
          </div>
        </div>
        <h3 className="font-heading font-bold text-lg mb-1">{clubName}</h3>
        <p className="text-neutral-medium text-sm mb-2">
          {clubLocation} • 18 holes
        </p>
        <div className="flex items-center mb-3">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage src={hostImageUrl} alt={hostName} />
            <AvatarFallback className="bg-primary text-white">
              {hostInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">
              Hosted by {hostName}
            </p>
          </div>
        </div>
        <div className="border-t pt-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-neutral-medium">
                {formatDate(date)}
              </p>
              <p className="text-lg font-bold">
                <span className="text-primary">${price}</span>{" "}
                <span className="text-sm font-normal text-neutral-medium">per player</span>
              </p>
            </div>
            <Link href={`/tee-times/${id}`}>
              <Button className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded transition-all">
                Book Now
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
