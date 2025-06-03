import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useCreateTeeTime } from "@/hooks/use-tee-times";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { CalendarIcon, Clock, Volleyball } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from 'react-helmet';

const timeOptions = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", 
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

const createListingSchema = z.object({
  clubId: z.string({
    required_error: "Please select a club",
  }),
  date: z.date({
    required_error: "Please select a date",
  }),
  time: z.string({
    required_error: "Please select a time",
  }),
  price: z.string().transform((val) => parseFloat(val)),
  playersAllowed: z.string().default("4"),
  notes: z.string().optional(),
});

type CreateListingFormValues = z.infer<typeof createListingSchema>;

export default function CreateListingPage() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { toast } = useToast();
  const { mutate: createTeeTime, isPending } = useCreateTeeTime();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    openAuthModal("login");
    navigate("/");
    return null;
  }

  // Redirect if not a host
  if (user && !user.isHost) {
    navigate("/dashboard");
    return null;
  }

  // Fetch user's clubs
  const { data: userClubs, isLoading: isLoadingClubs } = useQuery({
    queryKey: [`/api/users/${user?.id}/clubs`],
    queryFn: async () => {
      const response = await fetch(`/api/users/${user?.id}/clubs`);
      if (!response.ok) {
        throw new Error("Failed to fetch user clubs");
      }
      return response.json();
    },
    enabled: !!user,
  });

  const form = useForm<CreateListingFormValues>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      clubId: "",
      date: undefined,
      time: "",
      price: "",
      playersAllowed: "4",
      notes: "",
    },
  });

  const onSubmit = (data: CreateListingFormValues) => {
    if (!user) return;

    // Combine date and time
    const dateTime = new Date(data.date);
    const [hours, minutes] = data.time.split(":").map(Number);
    dateTime.setHours(hours, minutes);

    createTeeTime({
      hostId: user.id,
      clubId: parseInt(data.clubId),
      date: dateTime, // Send the actual Date object, not a string
      price: data.price,
      playersAllowed: parseInt(data.playersAllowed),
      notes: data.notes,
    }, {
      onSuccess: () => {
        toast({
          title: "Tee time created",
          description: "Your tee time listing has been created successfully.",
        });
        navigate("/dashboard");
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to create tee time listing. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <>
      <Helmet>
        <title>Create Tee Time Listing | Linx</title>
        <meta name="description" content="Host a tee time at your golf club. Share access to your club and earn income from your membership." />
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-heading font-bold text-neutral-dark mb-2">
              Create a Tee Time Listing
            </h1>
            <p className="text-neutral-medium">
              Share access to your club and earn income from your membership
            </p>
          </div>

          {isLoadingClubs ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : userClubs && userClubs.length > 0 ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="clubId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Club</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a club" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userClubs.map((userClub) => (
                            <SelectItem
                              key={userClub.clubId}
                              value={userClub.clubId.toString()}
                            >
                              {userClub.club.name}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={isPending}
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
                        <FormLabel>Time</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a time" />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per Player</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-7"
                              {...field}
                              disabled={isPending}
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
                        <FormLabel>Number of Players</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select number of players" />
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
                          Select how many players can join this tee time
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Share any additional details about this tee time..."
                          className="resize-none min-h-[120px]"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide any additional information guests should know
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Creating..." : "Create Listing"}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-secondary">
              <Volleyball className="h-12 w-12 mx-auto text-neutral-medium mb-4" />
              <h2 className="text-xl font-medium mb-2">No Clubs Found</h2>
              <p className="text-neutral-medium mb-6">
                You need to add a golf club to your profile before you can create a tee time listing.
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
