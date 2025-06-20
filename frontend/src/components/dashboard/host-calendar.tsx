import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parse, add, isSameMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { TeeTimeListing as SupabaseTeeTimeListing } from "@/hooks/use-profile";
import { useAuthStore } from "@/stores/authStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import CreateTeeTimeForm from "../tee-times/create-tee-time-form";

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  teeTimesCount: number;
  teeTimeIds: string[];
  isToday: boolean;
};

interface HostCalendarProps {
  teeTimeListings?: SupabaseTeeTimeListing[];
}

export default function HostCalendar({ teeTimeListings = [] }: HostCalendarProps) {
  const { user } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Generate calendar days for current month view
  useEffect(() => {
    if (!currentMonth) return;

    const generateCalendarDays = () => {
      const firstDayOfMonth = startOfMonth(currentMonth);
      const lastDayOfMonth = endOfMonth(currentMonth);
      const days = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });

      // Fill in days from previous/next month to complete the calendar grid (6 rows of 7 days)
      const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysFromPreviousMonth = firstDayOfWeek;
      
      // Previous month days
      const previousMonthDays = [];
      for (let i = daysFromPreviousMonth - 1; i >= 0; i--) {
        previousMonthDays.push(
          add(firstDayOfMonth, { days: -i - 1 })
        );
      }
      
      // Next month days (to fill a 6-row grid)
      const totalDaysToShow = 42; // 6 rows of 7 days
      const daysFromNextMonth = totalDaysToShow - days.length - previousMonthDays.length;
      const nextMonthDays = [];
      for (let i = 0; i < daysFromNextMonth; i++) {
        nextMonthDays.push(
          add(lastDayOfMonth, { days: i + 1 })
        );
      }

      // Combine all days
      const allDays = [...previousMonthDays, ...days, ...nextMonthDays];

      // Create calendar days with tee time data
      const today = new Date();
      return allDays.map(date => {
        const dayTeeTimeListings = teeTimeListings?.filter(
          (teeTime: SupabaseTeeTimeListing) => isSameDay(new Date(teeTime.date), date)
        ) || [];

        return {
          date,
          isCurrentMonth: isSameMonth(date, currentMonth),
          teeTimesCount: dayTeeTimeListings.length,
          teeTimeIds: dayTeeTimeListings.map((teeTime: SupabaseTeeTimeListing) => teeTime.id),
          isToday: isSameDay(date, today)
        };
      });
    };

    setCalendarDays(generateCalendarDays());
  }, [currentMonth, teeTimeListings]);

  // Navigate to previous/next month
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => add(prev, { months: -1 }));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => add(prev, { months: 1 }));
  };

  // Reset to current month
  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  // Handle day click to show tee times
  const handleDayClick = (day: CalendarDay) => {
    setSelectedDay(day.date);
  };

  const formatTeeTime = (teeTime: SupabaseTeeTimeListing) => {
    const teeTimeDate = new Date(teeTime.date);
    return format(teeTimeDate, "h:mm a");
  };

  // Get tee times for selected day
  const getSelectedDayTeeTimeListings = () => {
    if (!selectedDay || !teeTimeListings) return [];
    
    return teeTimeListings.filter(
      (teeTime: SupabaseTeeTimeListing) => isSameDay(new Date(teeTime.date), selectedDay)
    );
  };

  const selectedDayTeeTimeListings = getSelectedDayTeeTimeListings();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Tee Time Calendar</span>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={goToCurrentMonth}
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="font-medium">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Tee Time
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Tee Time</DialogTitle>
                  <DialogDescription>
                    Create a new tee time listing for your golf club. Fill in the details below to make your tee time available for booking.
                  </DialogDescription>
                </DialogHeader>
                <CreateTeeTimeForm 
                  initialDate={selectedDay || new Date()} 
                  onSuccess={() => setShowCreateDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="text-center text-sm font-medium text-neutral-medium">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => (
              <TooltipProvider key={i}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "h-16 p-1 rounded-md flex flex-col items-center justify-start border border-transparent hover:bg-accent/10 hover:border-accent/20 transition-all",
                        day.isCurrentMonth ? "bg-white" : "bg-muted/30",
                        day.isToday && "border-primary",
                        selectedDay && isSameDay(day.date, selectedDay) && "bg-accent/15 border-accent/30",
                      )}
                    >
                      <span 
                        className={cn(
                          "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                          day.isToday && "bg-primary text-white"
                        )}
                      >
                        {format(day.date, "d")}
                      </span>
                      {day.teeTimesCount > 0 && (
                        <Badge 
                          variant="outline" 
                          className="mt-1 bg-primary/10 border-primary/20 text-primary text-xs"
                        >
                          {day.teeTimesCount} {day.teeTimesCount === 1 ? "time" : "times"}
                        </Badge>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{format(day.date, "MMMM d, yyyy")}</p>
                    {day.teeTimesCount > 0 ? (
                      <p className="text-xs">{day.teeTimesCount} tee {day.teeTimesCount === 1 ? "time" : "times"} scheduled</p>
                    ) : (
                      <p className="text-xs">No tee times scheduled</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Selected day details */}
        {selectedDay && (
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-heading font-bold">
                {format(selectedDay, "MMMM d, yyyy")}
              </h3>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setSelectedDay(selectedDay);
                  setShowCreateDialog(true);
                }}
              >
                <CalendarIcon className="mr-1 h-4 w-4" /> 
                Add Tee Time
              </Button>
            </div>
            
            {selectedDayTeeTimeListings.length === 0 ? (
              <p className="text-neutral-medium text-sm py-3">
                No tee times scheduled for this day. Click "Add Tee Time" to create one.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDayTeeTimeListings.map((teeTime: SupabaseTeeTimeListing) => (
                  <Card key={teeTime.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">
                            {formatTeeTime(teeTime)} at {teeTime.clubs?.name}
                          </p>
                          <p className="text-xs text-neutral-medium">
                            ${teeTime.price} per player • {teeTime.players_allowed} spots available
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={teeTime.status === "available" ? "outline" : "secondary"}
                            className={
                              teeTime.status === "available" 
                                ? "bg-green-100 text-green-800 border-green-200" 
                                : "bg-neutral-100 text-neutral-800"
                            }
                          >
                            {teeTime.status === "available" ? "Available" : teeTime.status}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <span className="sr-only">Edit</span>
                            <span className="h-4 w-4">•••</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}