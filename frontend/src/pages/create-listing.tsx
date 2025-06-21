import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useCreateTeeTime } from "@/hooks/use-tee-times";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, AlertCircle, Building, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from 'react-helmet';

// Time options for tee times (12-hour format)
const timeOptions = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", 
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM"
];

// Helper function to convert 12-hour format to 24-hour format
function convertTo24Hour(time12h: string): { hours: number; minutes: number } {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  if (modifier === 'PM' && hours !== 12) {
    hours += 12;
  } else if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return { hours, minutes };
}

// Zod validation schema
const createListingSchema = z.object({
  clubId: z.string({
    required_error: "Please select a club",
  }).min(1, "Please select a club"),
  date: z.date({
    required_error: "Please select a date",
  }),
  time: z.string({
    required_error: "Please select a time",
  }).min(1, "Please select a time"),
  price: z.string()
    .min(1, "Price is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "Price must be a valid positive number",
    })
    .transform((val) => parseFloat(val)),
  playersAllowed: z.string()
    .default("4")
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 1 && parseInt(val) <= 4, {
      message: "Players allowed must be between 1 and 4",
    })
    .transform((val) => parseInt(val)),
  notes: z.string().optional(),
});

type CreateListingFormValues = z.infer<typeof createListingSchema>;

// Interface for user clubs from Supabase
interface UserClub {
  id: string;
  user_id: string;
  club_id: number;
  member_since: string;
  clubs: {
    id: number;
    name: string;
    location: string;
    description?: string;
  };
}

export default function CreateListingPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, openAuthModal } = useAuthStore();
  const { toast } = useToast();
  const { mutate: createTeeTime, isPending: isCreating } = useCreateTeeTime();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      openAuthModal("login");
      navigate("/");
    }
  }, [isAuthenticated, openAuthModal, navigate]);

  // Redirect if not a host
  useEffect(() => {
    if (user && !user.isHost) {
      toast({
        title: "Access Denied",
        description: "Only hosts can create tee time listings.",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [user, navigate, toast]);

  // Fetch user's affiliated clubs using Supabase
  const { 
    data: userClubs = [], 
    isLoading: isLoadingClubs, 
    error: clubsError 
  } = useQuery<UserClub[]>({
    queryKey: [
      'supabase:user_clubs:select',
      {
        columns: `
          id,
          user_id,
          club_id,
          member_since,
          clubs (
            id,
            name,
            location,
            description
          )
        `,
        eq: { user_id: user?.id },
        order: { column: 'member_since', ascending: false }
      }
    ],
    enabled: !!user?.id && !!user?.isHost,
  });

  const form = useForm<CreateListingFormValues>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      clubId: "",
      date: undefined,
      time: "",
      price: "",
      playersAllowed: 4,
      notes: "",
    },
  });

  const onSubmit = (data: CreateListingFormValues) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not found. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    // Combine date and time into a single Date object
    const dateTime = new Date(data.date);
    const { hours, minutes } = convertTo24Hour(data.time);
    dateTime.setHours(hours, minutes, 0, 0);

    // Validate that the date/time is in the future
    if (dateTime <= new Date()) {
      toast({
        title: "Invalid Date/Time",
        description: "Please select a future date and time for your tee time.",
        variant: "destructive",
      });
      return;
    }

    createTeeTime({
      hostId: user.id,
      clubId: parseInt(data.clubId),
      date: dateTime,
      price: data.price,
      playersAllowed: data.playersAllowed,
      notes: data.notes?.trim() || undefined,
    }, {
      onSuccess: () => {
        toast({
          title: "Tee time created successfully!",
          description: "Your tee time listing is now available for booking.",
        });
        navigate("/dashboard");
      },
      onError: (error) => {
        console.error('Create tee time error:', error);
        toast({
          title: "Failed to create tee time",
          description: error.message || "An error occurred while creating your tee time listing. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  // Don't render anything while checking authentication
  if (!isAuthenticated || (user && !user.isHost)) {
    return null;
  }

  // Loading state for clubs
  if (isLoadingClubs) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-neutral-medium">Loading your clubs...</p>
        </div>
      </div>
    );
  }

  // Error state for clubs fetch
  if (clubsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-neutral-dark mb-2">Failed to load clubs</h1>
          <p className="text-neutral-medium mb-4">Unable to fetch your club affiliations</p>
          <Button onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // No clubs state
  if (userClubs.length === 0) {
    return (
      <>
        <Helmet>
          <title>Create Tee Time Listing | ClubKey</title>
          <meta name="description" content="Create a new tee time listing at your golf club" />
        </Helmet>
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2 text-2xl">
                  <Building className="h-6 w-6" />
                  <span>No Club Affiliations</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                <p className="text-neutral-medium mb-6">
                  You need to be affiliated with at least one golf club before you can create tee time listings.
                </p>
                <div className="space-y-3">
                  <Button onClick={() => navigate("/profile-onboarding")}>
                    Add Club Affiliation
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard")}>
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Create Tee Time Listing | ClubKey</title>
        <meta name="description" content="Host a tee time at your golf club. Share access to your club and earn income from your membership." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-dark mb-2">
              Create a Tee Time Listing
            </h1>
            <p className="text-neutral-medium">
              Share access to your club and earn income from your membership
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tee Time Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Club Selection */}
                  <FormField
                    control={form.control}
                    name="clubId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Club *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isCreating}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose your club" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {userClubs.map((userClub) => (
                              <SelectItem
                                key={userClub.clubs.id}
                                value={userClub.clubs.id.toString()}
                              >
                                <div className="flex items-center space-x-2">
                                  <Building className="h-4 w-4" />
                                  <div>
                                    <div className="font-medium">{userClub.clubs.name}</div>
                                    <div className="text-sm text-neutral-medium flex items-center">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {userClub.clubs.location}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the club where you're hosting this tee time
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  disabled={isCreating}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Select the date for your tee time
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isCreating}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timeOptions.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select the time for your tee time
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Price and Players */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price per Player *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-medium">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-7"
                                {...field}
                                disabled={isCreating}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Set the price per player for this tee time
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="playersAllowed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Players *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value.toString()}
                            disabled={isCreating}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select players" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1 player</SelectItem>
                              <SelectItem value="2">2 players</SelectItem>
                              <SelectItem value="3">3 players</SelectItem>
                              <SelectItem value="4">4 players</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            How many players can join this tee time
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Share any additional details about this tee time (dress code, cart requirements, skill level, etc.)..."
                            className="resize-none min-h-[120px]"
                            {...field}
                            disabled={isCreating}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide any additional information guests should know
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/dashboard")}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isCreating}
                      className="min-w-[120px]"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Listing"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}