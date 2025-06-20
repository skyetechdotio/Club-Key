import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTeeTimeListings, TeeTimeSearchFilters } from "@/hooks/use-tee-times";
import { SearchFilters, SearchFilters as SearchFiltersType } from "@/components/listings/search-filters";
import TeeTimeCard from "@/components/listings/tee-time-card";
import SearchFiltersComponent from "@/components/listings/search-filters";
import { parseQueryParams } from "@/lib/utils";
import { Helmet } from 'react-helmet';
import { Button } from "@/components/ui/button";
import { MapPin, Filter, CalendarRange, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

// Interface for Supabase tee time listing with joins
interface SupabaseTeeTimeListing {
  id: number; // serial primary key from schema
  host_id: string; // UUID from profiles table
  club_id: number; // serial primary key from clubs table
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
  host?: {
    id: string;
    first_name?: string;
    last_name?: string;
    username: string;
    profile_image_url?: string;
  };
}

export default function TeeTimesPage() {
  const [location, setLocation] = useLocation();
  
  // Popular locations users can quickly select
  const popularLocations = [
    "Augusta, GA",
    "Pebble Beach, CA",
    "St. Andrews, Scotland",
    "Pinehurst, NC",
    "Scottsdale, AZ"
  ];
  
  // Parse the URL search parameters into filters state
  const parseUrlFilters = () => {
    // Use window.location.search to get the current URL search parameters
    const searchString = window.location.search;
    
    const searchParams = new URLSearchParams(searchString);
    const params = parseQueryParams(searchParams) as Partial<SearchFilters>;
    
    // Handle date parameter
    if (params.date && typeof params.date === "string") {
      params.date = new Date(params.date);
    }
    
    // Handle endDate parameter
    if (params.endDate && typeof params.endDate === "string") {
      params.endDate = new Date(params.endDate);
    }
    
    // These are already strings, no need to convert
    // params.distance
    // params.players
    
    return params as SearchFilters;
  };
  
  const [filters, setFilters] = useState<SearchFilters>(parseUrlFilters());
  
  // Re-evaluate filters when the URL location changes
  useEffect(() => {
    setFilters(parseUrlFilters());
  }, [location]);
  
  // Helper to quickly select a popular location
  const selectLocation = (locationName: string) => {
    const newFilters = { ...filters, location: locationName };
    handleSearch(newFilters);
  };

  // Convert SearchFilters to TeeTimeSearchFilters for Supabase
  const searchFilters: TeeTimeSearchFilters = {
    location: filters.location,
    date: filters.date,
    endDate: filters.endDate,
    players: filters.players,
    distance: filters.distance,
  };

  // Fetch tee time listings with filters from Supabase
  const { data: teeTimeListings, isLoading, error } = useTeeTimeListings(searchFilters);

  // Update URL when filters change
  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    
    if (newFilters.location) {
      params.append("location", newFilters.location);
    }
    
    if (newFilters.date) {
      params.append("date", newFilters.date.toISOString().split("T")[0]);
    }
    
    if (newFilters.endDate) {
      params.append("endDate", newFilters.endDate.toISOString().split("T")[0]);
    }
    
    if (newFilters.players) {
      params.append("players", newFilters.players);
    }
    
    if (newFilters.distance) {
      params.append("distance", newFilters.distance);
    }
    
    setLocation(`/tee-times?${params.toString()}`);
  };

  const toggleFavorite = (id: number) => {
    // This would normally update a user's favorites in the backend
    console.log(`Toggled favorite for tee time ${id}`);
    // TODO: Implement favorites functionality with Supabase
  };

  return (
    <>
      <Helmet>
        <title>Browse Golf Tee Times | ClubKey</title>
        <meta name="description" content="Search for available tee times at exclusive golf clubs. Connect with member hosts and play at prestigious courses typically reserved for members only." />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-neutral-dark mb-4">
            Find Tee Times
          </h1>
          
          {/* Popular Locations */}
          <div className="mb-6">
            <div className="flex items-center mb-2">
              <MapPin className="h-4 w-4 text-primary mr-1" />
              <h3 className="text-sm font-medium">Popular Locations</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularLocations.map((loc) => (
                <Badge 
                  key={loc} 
                  variant={filters.location === loc ? "default" : "outline"}
                  className={`cursor-pointer ${filters.location === loc ? 'bg-primary' : 'hover:bg-secondary/10'}`}
                  onClick={() => selectLocation(loc)}
                >
                  {loc}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Main Search Filters */}
          <SearchFiltersComponent 
            onSearch={handleSearch} 
            initialFilters={filters}
          />
        </div>

        {/* Active Filters Display */}
        {(filters.location || filters.date) && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-neutral-dark mr-1">Active Filters:</span>
            
            {filters.location && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {filters.location}
              </Badge>
            )}
            
            {filters.date && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CalendarRange className="h-3 w-3" />
                {new Date(filters.date).toLocaleDateString()}
              </Badge>
            )}
            
            <Button 
              variant="ghost" 
              className="h-7 px-2 text-xs"
              onClick={() => handleSearch({
                location: "",
                players: "2",
              })}
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Loading, Error, and Results States */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-neutral-medium">Searching for tee times...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-red-50 rounded-lg border border-red-100 p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-neutral-dark mb-2">
              Error Loading Tee Times
            </h2>
            <p className="text-neutral-medium mb-4">
              {error?.message || "There was a problem loading the tee times. Please try again later."}
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : teeTimeListings?.length > 0 ? (
          <>
            <div className="mb-6 flex justify-between items-center">
              <p className="text-neutral-medium">
                <span className="font-medium text-neutral-dark">{teeTimeListings.length}</span> tee time{teeTimeListings.length !== 1 ? "s" : ""} available
              </p>
              <div className="flex items-center">
                <span className="text-sm text-neutral-medium mr-2">Sort by:</span>
                <select className="text-sm border rounded px-2 py-1">
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Date: Soonest</option>
                  <option>Rating: Highest</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teeTimeListings.map((teeTime: SupabaseTeeTimeListing) => (
                <TeeTimeCard
                  key={teeTime.id}
                  id={teeTime.id} // Now correctly typed as number
                  clubName={teeTime.clubs?.name || "Unknown Club"}
                  clubLocation={teeTime.clubs?.location || "Unknown Location"}
                  clubImageUrl={teeTime.clubs?.image_url || ""}
                  hostName={
                    teeTime.host?.first_name 
                      ? `${teeTime.host.first_name}${teeTime.host.last_name ? ` ${teeTime.host.last_name}` : ''}`
                      : teeTime.host?.username || "Unknown Host"
                  }
                  hostImageUrl={teeTime.host?.profile_image_url}
                  hostInitials={
                    teeTime.host?.first_name && teeTime.host?.last_name
                      ? `${teeTime.host.first_name[0]}${teeTime.host.last_name[0]}`
                      : teeTime.host?.username?.substring(0, 2).toUpperCase() || "UH"
                  }
                  date={teeTime.date}
                  price={teeTime.price}
                  rating={0} // TODO: Add rating calculation from reviews
                  reviewCount={0} // TODO: Add review count from reviews
                  onFavoriteToggle={toggleFavorite}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100 p-6">
            <h2 className="text-xl font-medium text-neutral-dark mb-2">
              No Tee Times Found
            </h2>
            <p className="text-neutral-medium mb-4">
              We couldn't find any tee times matching your criteria. Try adjusting your filters or check out these popular locations.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {popularLocations.slice(0, 3).map((loc) => (
                <Button 
                  key={loc} 
                  variant="outline"
                  className="bg-white"
                  onClick={() => selectLocation(loc)}
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  {loc}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
