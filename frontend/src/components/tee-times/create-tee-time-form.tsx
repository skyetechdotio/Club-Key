import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addHours } from "date-fns";
import { CalendarIcon, ClockIcon, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCreateTeeTime } from "@/hooks/use-tee-times";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

// Form schema
const formSchema = z.object({
  clubId: z.coerce.number({
    required_error: "Please select a golf club",
  }),
  date: z.date({
    required_error: "Please select a date and time",
  }),
  price: z.coerce.number({
    required_error: "Please enter a price",
  }).min(1, "Price must be at least $1"),
  playersAllowed: z.coerce.number({
    required_error: "Please select the number of players",
  }).min(1, "At least 1 player must be allowed"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTeeTimeFormProps {
  initialDate?: Date;
  onSuccess?: () => void;
}

export default function CreateTeeTimeForm({ initialDate = new Date(), onSuccess }: CreateTeeTimeFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createTeeTime = useCreateTeeTime();
  const [timeValue, setTimeValue] = useState("10:00");
  
  // Fetch user clubs from API
  const { data: userClubs, isLoading: isLoadingClubs } = useQuery({
    queryKey: [`/api/users/${user?.id}/clubs`],
    enabled: !!user?.id,
  });
  
  // Parse clubs from API response
  const clubs = Array.isArray(userClubs) ? userClubs.map((userClub: any) => ({
    id: userClub.club.id,
    name: userClub.club.name
  })) : [];
  
  // Form definition
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clubId: undefined,
      date: initialDate,
      price: 100,
      playersAllowed: 3,
      notes: "",
    },
  });
  
  // Combine date and time on submit
  const onSubmit = (values: FormValues) => {
    if (!user) return;
    
    try {
      // Parse time value and adjust the date
      const [hours, minutes] = timeValue.split(":").map(Number);
      const dateWithTime = new Date(values.date);
      dateWithTime.setHours(hours, minutes);
      
      createTeeTime.mutate({
        hostId: user.id,
        clubId: values.clubId,
        date: dateWithTime.toISOString(),
        price: values.price,
        playersAllowed: values.playersAllowed,
        notes: values.notes,
      }, {
        onSuccess: () => {
          toast({
            title: "Tee time created!",
            description: "Your tee time has been successfully created.",
          });
          form.reset();
          onSuccess?.();
        },
        onError: (error) => {
          toast({
            title: "Something went wrong",
            description: error instanceof Error ? error.message : "Failed to create tee time. Please try again.",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      toast({
        title: "Invalid form data",
        description: "Please check your form inputs and try again.",
        variant: "destructive",
      });
    }
  };
  
  // Generate time options for the select (from 6:00 AM to 6:00 PM in 30 min increments)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        options.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    return options;
  };
  
  const timeOptions = generateTimeOptions();
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="clubId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Golf Club</FormLabel>
                <Select 
                  value={field.value?.toString()} 
                  onValueChange={(value) => field.onChange(parseInt(value))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a club" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[300px]">
                    {clubs && clubs.length > 0 ? clubs.map((club: any) => (
                      <SelectItem key={club.id} value={club.id.toString()}>
                        {club.name}
                      </SelectItem>
                    )) : (
                      <div className="p-2 text-center text-muted-foreground">
                        No clubs available
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the golf club where the tee time is available.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
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
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PP") : "Select date"}
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
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>Time</FormLabel>
              <Select value={timeValue} onValueChange={setTimeValue}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center">
                        <ClockIcon className="mr-2 h-4 w-4" />
                        {timeValue}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[300px]">
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the time of the tee time.
              </FormDescription>
            </FormItem>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price per Player</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                      <Input
                        type="number"
                        className="pl-9"
                        {...field}
                        min={1}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Set the price per player in USD.
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
                  <FormLabel>Players Allowed</FormLabel>
                  <Select 
                    value={field.value?.toString()} 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          <div className="flex items-center">
                            <Users className="mr-2 h-4 w-4" />
                            {field.value} player{field.value !== 1 ? "s" : ""}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {[1, 2, 3, 4].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} player{num !== 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How many spots are available for this tee time.
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
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Any additional details or requirements for guests..." 
                    {...field} 
                    rows={3}
                  />
                </FormControl>
                <FormDescription>
                  Optional: Add any special instructions or information for guests.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <h3 className="text-sm font-medium mb-2">Preview</h3>
            <div className="text-sm">
              <p><span className="font-medium">Club:</span> {clubs && clubs.length > 0 && form.watch("clubId") ? 
                clubs.find((c: any) => c.id.toString() === form.watch("clubId").toString())?.name || "Not selected" 
                : "Not selected"}</p>
              <p>
                <span className="font-medium">Date & Time:</span> {form.watch("date") 
                  ? `${format(form.watch("date"), "MMMM d, yyyy")} at ${timeValue}`
                  : "Not selected"
                }
              </p>
              <p><span className="font-medium">Price:</span> ${form.watch("price") || 0} per player</p>
              <p><span className="font-medium">Players:</span> {form.watch("playersAllowed") || 0} spots available</p>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onSuccess?.()}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createTeeTime.isPending}
            className="bg-primary hover:bg-primary-dark"
          >
            {createTeeTime.isPending ? "Creating..." : "Create Tee Time"}
          </Button>
        </div>
      </form>
    </Form>
  );
}