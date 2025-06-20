import { useLocation } from "wouter";
import SearchFilters, { SearchFilters as SearchFiltersType } from "@/components/listings/search-filters";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";

export default function HeroSection() {
  const [, setLocation] = useLocation();
  const { openAuthModal, isAuthenticated } = useAuthStore();

  const handleSearch = (filters: SearchFiltersType) => {
    console.log("Hero search called with filters:", filters);
    
    const params = new URLSearchParams();
    
    if (filters.location) {
      params.append("location", filters.location);
      console.log("Adding location to search:", filters.location);
    }
    
    if (filters.date) {
      params.append("date", filters.date.toISOString().split("T")[0]);
      console.log("Adding date to search:", filters.date.toISOString().split("T")[0]);
    }
    
    if (filters.players) {
      params.append("players", filters.players);
      console.log("Adding players to search:", filters.players);
    }
    
    const searchUrl = `/tee-times?${params.toString()}`;
    console.log("Navigating to:", searchUrl);
    setLocation(searchUrl);
  };

  return (
    <section className="bg-white">
      <div 
        className="h-[650px] md:h-[700px] w-full bg-cover bg-center relative" 
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1535131749006-b7f58c99034b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" 
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="container mx-auto px-4 h-full flex md:items-start items-center pt-32 md:pt-28 pb-16 sm:pb-4 relative z-10">
          <div className="max-w-3xl py-8 md:py-6">
            <h1 className="text-white text-4xl md:text-5xl font-heading font-bold mb-4">
              Play golf with members at private clubs
            </h1>
            <p className="text-white text-xl mb-6">
              Gain access with member hosted tee times to exclusive golf clubs reserved for members only.
            </p>
            
            {/* Sign-up CTA for non-authenticated users */}
            {!isAuthenticated && (
              <div className="mb-6">
                <Button 
                  onClick={() => openAuthModal("register")} 
                  className="bg-[#49DCB1] hover:bg-[#49DCB1]/90 text-white font-medium text-base px-6 py-4 rounded-full h-auto"
                >
                  Sign Up
                </Button>
              </div>
            )}

            {/* Using the same SearchFilters component that's on the Find Tee Times page */}
            <div className="w-full md:w-[130%] xl:w-[140%]">
              <SearchFilters 
                onSearch={handleSearch}
                initialFilters={{
                  location: "",
                  players: "2"
                }}
                className="shadow-lg"
                isCompact={true}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
