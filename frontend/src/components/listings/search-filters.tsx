import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, addDays, isSaturday, isSunday, startOfWeek, nextSaturday } from "date-fns";
import { cn } from "@/lib/utils";
import { MapPin, Calendar as CalendarIcon, Users2, ChevronDown, Filter, Search, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface SearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
  className?: string;
  isCompact?: boolean;
}

export interface SearchFilters {
  location: string;
  date?: Date;
  endDate?: Date;
  players: string;
  distance?: string; // Distance in miles
}

export default function SearchFilters({
  onSearch,
  initialFilters = {
    location: "",
    players: "2",
  },
  className,
  isCompact = false
}: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Define quick filter options
  const quickFilters = [
    { 
      name: "This Weekend", 
      icon: <CalendarIcon className="h-3 w-3 mr-1" />,
      apply: () => {
        const today = new Date();
        // Get the next Saturday (or today if it's Saturday)
        const saturday = today.getDay() === 6 
          ? today // Today is Saturday
          : nextSaturday(today); // Get next Saturday
        
        // Get Sunday (the day after Saturday)
        const sunday = new Date(saturday);
        sunday.setDate(sunday.getDate() + 1);
        
        console.log("Applying weekend filter for dates:", saturday.toISOString(), "to", sunday.toISOString());
        return { ...filters, date: saturday, endDate: sunday };
      }
    }
  ];

  // Apply a quick filter
  const applyQuickFilter = (index: number) => {
    const newFilters = quickFilters[index].apply();
    setFilters(newFilters);
    submitSearch(newFilters);
  };

  // Submit search with current filters
  const submitSearch = (searchFilters = filters) => {
    onSearch({
      ...searchFilters
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch();
  };

  return (
    <Card className={cn("bg-white", className)}>
      <CardContent className={cn("p-4", isCompact && "p-3")}>
        <form onSubmit={handleSubmit}>
          <div className={cn(
            "flex flex-col gap-3 mb-4",
            isCompact ? "md:flex-row md:flex-wrap lg:flex-nowrap" : "md:flex-row"
          )}>
            <div className={cn("flex-1", isCompact && "min-w-[180px]")}>
              <label className="block text-sm font-medium text-neutral-dark mb-1">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-light" />
                <Input 
                  placeholder="City, state or course name" 
                  className="pl-9"
                  value={filters.location}
                  onChange={(e) => setFilters({...filters, location: e.target.value})}
                />
              </div>
            </div>

            <div className={cn("w-full", isCompact ? "md:w-[170px] lg:w-auto" : "md:w-auto")}>
              <label className="block text-sm font-medium text-neutral-dark mb-1">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left",
                      !filters.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.date && filters.endDate 
                      ? `${format(filters.date, "MMM d")} - ${format(filters.endDate, "MMM d, yyyy")}`.substring(0, isCompact ? 18 : 30) + (isCompact && filters.date !== filters.endDate ? "..." : "")
                      : filters.date 
                      ? format(filters.date, "MMM d, yyyy") 
                      : "Select dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3">
                    <div className="space-y-1 mb-3">
                      <h4 className="text-sm font-medium">Select Dates</h4>
                      <p className="text-xs text-muted-foreground">
                        Choose a single day or a range of dates
                      </p>
                    </div>
                    
                    <Calendar
                      mode="range"
                      selected={{
                        from: filters.date,
                        to: filters.endDate
                      }}
                      onSelect={(range: DateRange | undefined) => {
                        if (range?.from) {
                          // If only one date is selected, use it for both start and end
                          if (!range.to) {
                            setFilters({
                              ...filters,
                              date: range.from,
                              endDate: range.from
                            });
                          } else {
                            setFilters({
                              ...filters,
                              date: range.from,
                              endDate: range.to
                            });
                          }
                        } else {
                          // Clear the dates if nothing is selected
                          setFilters({
                            ...filters,
                            date: undefined,
                            endDate: undefined
                          });
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      numberOfMonths={1}
                      className="rounded-md border shadow"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className={cn("w-full", isCompact ? "md:w-[130px]" : "md:w-auto")}>
              <label className="block text-sm font-medium text-neutral-dark mb-1">Players</label>
              <Select 
                value={filters.players}
                onValueChange={(value) => setFilters({...filters, players: value})}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center">
                    <Users2 className="mr-2 h-4 w-4 text-neutral-light" />
                    <SelectValue placeholder="Select players" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 player</SelectItem>
                  <SelectItem value="2">2 players</SelectItem>
                  <SelectItem value="3">3 players</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className={cn("w-full", isCompact ? "md:w-[150px]" : "md:w-auto")}>
              <label className="block text-sm font-medium text-neutral-dark mb-1">Distance (miles)</label>
              <Select
                value={filters.distance || "any"}
                onValueChange={(value) => setFilters({...filters, distance: value === "any" ? undefined : value})}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4 text-neutral-light" />
                    <SelectValue placeholder="Select distance" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any distance</SelectItem>
                  <SelectItem value="10">Within 10 miles</SelectItem>
                  <SelectItem value="25">Within 25 miles</SelectItem>
                  <SelectItem value="50">Within 50 miles</SelectItem>
                  <SelectItem value="100">Within 100 miles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={cn(
              "w-full self-end", 
              isCompact 
                ? "md:ml-auto md:w-[100px] lg:w-auto" 
                : "md:w-auto"
            )}>
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90"
                size={isCompact ? "sm" : "default"}
              >
                <Search className="mr-2 h-4 w-4" /> Search
              </Button>
            </div>
          </div>
          
          {/* Filters Section - only show when not in compact mode */}
          {!isCompact && (
            <div className="border-t pt-4">
              <div className="flex items-center mb-3">
                <Filter className="h-4 w-4 text-primary mr-1" />
                <h3 className="text-sm font-medium">Filters</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Weekend Filter */}
                <div>
                  <Badge 
                    key="this-weekend"
                    variant={filters.date && filters.endDate && 
                            format(filters.date, "EEE") === "Sat" && 
                            format(filters.endDate, "EEE") === "Sun" ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer hover:bg-secondary/10 transition-colors",
                      filters.date && filters.endDate && 
                      format(filters.date, "EEE") === "Sat" && 
                      format(filters.endDate, "EEE") === "Sun" && "bg-primary text-white"
                    )}
                    onClick={() => applyQuickFilter(0)}
                  >
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    This Weekend
                  </Badge>
                </div>
                {/* Extra space for future filters */}
                <div></div>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
