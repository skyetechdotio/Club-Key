import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Club } from "@shared/schema";

const registerSchema = z
  .object({
    email: z.string().email({ message: "Please enter a valid email address" }),
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
    isHost: z.boolean().default(false),
    termsAccepted: z.boolean().refine(value => value === true, {
      message: "You must accept the terms and conditions"
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSuccess: () => void;
  switchToLogin: () => void;
}

// Define onboarding schema and profile form schema
const profileSchema = z.object({
  bio: z.string().optional(),
  profileImage: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const clubSchema = z.object({
  clubId: z.string().optional(),
});

type ClubFormValues = z.infer<typeof clubSchema>;

export default function RegisterForm({ onSuccess, switchToLogin }: RegisterFormProps) {
  const { register, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"register" | "profile" | "club">("register");
  const [user, setUser] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState("");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubLoading, setClubLoading] = useState(false);

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
      isHost: false,
      termsAccepted: false,
    },
  });

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: "",
      profileImage: "",
    },
  });

  // Club form
  const clubForm = useForm<ClubFormValues>({
    resolver: zodResolver(clubSchema),
    defaultValues: {
      clubId: "",
    },
  });

  // Load clubs when needed
  useEffect(() => {
    if (step === "club" && user?.isHost) {
      fetchClubs();
    }
  }, [step, user]);

  // Fetch available clubs
  const fetchClubs = async () => {
    try {
      setClubLoading(true);
      const res = await apiRequest("GET", "/api/clubs");
      if (res.ok) {
        const clubsData = await res.json();
        setClubs(clubsData);
      }
    } catch (error) {
      console.error("Error fetching clubs:", error);
    } finally {
      setClubLoading(false);
    }
  };

  // Handle file upload for profile image 
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is too large (> 1MB) to compress
      if (file.size > 1024 * 1024) {
        // Create a compressed image
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (event) => {
          img.onload = () => {
            // Create a canvas element to compress the image
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Calculate new dimensions while maintaining aspect ratio
            // Target max width/height of 800px
            const MAX_SIZE = 800;
            if (width > height && width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw the resized image to canvas
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              
              // Convert to base64 with reduced quality (0.7 = 70% quality)
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
              
              // Use the compressed image
              setImagePreview(compressedBase64);
              setProfileImage(compressedBase64);
            }
          };
          
          // Set the image source to the loaded file
          img.src = event.target?.result as string;
        };
        
        reader.readAsDataURL(file);
      } else {
        // For small files, no need to compress
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          setImagePreview(base64String);
          setProfileImage(base64String);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Handle the initial registration
  async function handleRegister(data: RegisterFormValues) {
    setIsLoading(true);
    try {
      const userData = await register({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        isHost: data.isHost,
      });
      
      // Set the user data and move to next step
      setUser(userData);
      
      toast({
        title: "Account created",
        description: "Let's complete your profile.",
      });
      
      // Move to the profile step
      setStep("profile");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Handle profile update
  async function handleProfileUpdate(data: ProfileFormValues) {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User account not found. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const profileData = {
        bio: data.bio,
        profileImage: profileImage || ''
      };
      
      const res = await apiRequest("PUT", `/api/users/${user.id}`, profileData);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to update profile" }));
        throw new Error(errorData.message || "Failed to update profile");
      }
      
      // Refresh user data
      await refreshUserData();
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      // For hosts, proceed to club selection; for guests, complete onboarding
      if (user.isHost) {
        setStep("club");
      } else {
        // For guests, we're done with onboarding
        await completeOnboarding();
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Handle club selection
  async function handleClubSelection(data: ClubFormValues) {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User account not found. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (data.clubId) {
      setIsLoading(true);
      try {
        // Add user to club
        const clubData = {
          userId: user.id,
          clubId: parseInt(data.clubId)
        };
        
        const res = await apiRequest("POST", "/api/user-clubs", clubData);
        if (!res.ok) {
          throw new Error("Failed to add user to club");
        }
        
        // Complete onboarding
        await completeOnboarding();
        
        toast({
          title: "Club selected",
          description: "Your club selection has been saved.",
        });
        
        onSuccess();
      } catch (error: any) {
        toast({
          title: "Error selecting club",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Skip club selection
      await completeOnboarding();
      onSuccess();
    }
  }

  // Mark onboarding as complete
  async function completeOnboarding() {
    if (user?.id) {
      try {
        await apiRequest("PUT", `/api/users/${user.id}`, {
          onboardingCompleted: true
        });
        await refreshUserData();
        
        toast({
          title: "Setup complete!",
          description: "Your profile setup is complete. Welcome to Linx!",
        });
      } catch (error) {
        console.error("Error completing onboarding:", error);
      }
    }
  }

  // Skip club selection
  const skipClub = async () => {
    await completeOnboarding();
    onSuccess();
  };

  return (
    <div className="px-1">
      {/* STEP 1: REGISTRATION */}
      {step === "register" && (
        <>
          <div className="mb-4 text-center">
            <h3 className="text-xl font-semibold text-gray-900">Sign Up</h3>
            <p className="text-sm text-gray-500 mt-1">Join Linx to book or host tee times!</p>
          </div>

          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={registerForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={registerForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="isHost"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal">
                        I am a golf club member and want to host tee times
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal">
                        I agree to the{" "}
                        <a href="#" className="text-primary hover:underline">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="text-primary hover:underline">
                          Privacy Policy
                        </a>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account
                  </>
                ) : (
                  "Sign up"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Button
                variant="link"
                className="p-0 text-primary font-medium h-auto"
                onClick={switchToLogin}
                type="button"
              >
                Sign in
              </Button>
            </p>
          </div>
        </>
      )}

      {/* STEP 2: PROFILE SETUP */}
      {step === "profile" && (
        <>
          <div className="mb-4 text-center">
            <h3 className="text-xl font-semibold text-gray-900">Complete Your Profile</h3>
            <p className="text-sm text-gray-500 mt-1">Tell us more about yourself</p>
          </div>

          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-6">
              <div className="flex flex-col items-center mb-6">
                {/* Profile Image Upload */}
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 mb-4">
                  {imagePreview ? (
                    <img 
                      src={imagePreview} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-2xl font-bold">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                  )}
                </div>
                
                <div className="w-full max-w-sm mb-4">
                  <label 
                    htmlFor="profile-picture" 
                    className="cursor-pointer flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed rounded-md border-primary/30 hover:border-primary/50"
                  >
                    <Upload className="h-4 w-4" />
                    {imagePreview ? "Change Photo" : "Upload Photo"}
                  </label>
                  <input
                    id="profile-picture"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
                
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
              </div>

              <FormField
                control={profileForm.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About You</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about your golfing experience, favorite courses, or handicap..."
                        rows={5}
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </Form>
        </>
      )}

      {/* STEP 3: CLUB SELECTION (Only for hosts) */}
      {step === "club" && (
        <>
          <div className="mb-4 text-center">
            <h3 className="text-xl font-semibold text-gray-900">Select Your Golf Club</h3>
            <p className="text-sm text-gray-500 mt-1">Choose the club where you'll host tee times</p>
          </div>

          <Form {...clubForm}>
            <form onSubmit={clubForm.handleSubmit(handleClubSelection)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={clubForm.control}
                  name="clubId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select a Golf Club</FormLabel>
                      <Select
                        disabled={isLoading || clubLoading}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a golf club" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clubs && clubs.map((club: Club) => (
                            <SelectItem key={club.id} value={club.id.toString()}>
                              {club.name} - {club.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="pt-4 flex flex-col gap-4">
                  <Button
                    type="submit"
                    disabled={isLoading || clubLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Selecting Club...
                      </>
                    ) : (
                      "Select Club"
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={skipClub}
                    className="w-full"
                  >
                    Skip for Now
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}
