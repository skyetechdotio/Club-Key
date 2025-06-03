import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { Loader2, Upload } from "lucide-react";
import { Club } from "@shared/schema";

export default function ProfileOnboarding() {
  const [showClubForm, setShowClubForm] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Use auth context to get user and refresh function
  const { user, isLoading: isUserLoading, refreshUserData, isAuthenticated } = useAuth();
  
  // If user is not authenticated, redirect to home
  useEffect(() => {
    if (!isUserLoading && !isAuthenticated) {
      navigate("/");
    }
  }, [isUserLoading, isAuthenticated, navigate]);

  // Set initial values
  useEffect(() => {
    if (user) {
      // Set the profile image if exists
      if (user.profileImage) {
        setImagePreview(user.profileImage);
        setProfileImage(user.profileImage);
      }
    }
  }, [user]);

  // Get all clubs
  const { data: clubs } = useQuery({
    queryKey: ["/api/clubs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/clubs");
      if (!res.ok) {
        throw new Error("Failed to load clubs");
      }
      return res.json();
    },
  });

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

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!user?.id) {
        throw new Error("User ID not found. Please try logging out and back in.");
      }
      
      const data = {
        firstName: user.firstName,
        lastName: user.lastName, 
        bio: formData.get('bio') as string,
        profileImage: profileImage || '',
      };
      
      const res = await apiRequest("PUT", `/api/users/${user.id}`, data);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to update profile" }));
        throw new Error(errorData.message || "Failed to update profile");
      }
      
      return await res.json();
    },
    onSuccess: async () => {
      // Refresh user data
      await refreshUserData();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}`] });
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      setShowClubForm(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add user to club mutation
  const addUserToClubMutation = useMutation({
    mutationFn: async (data: { userId: number, clubId: number }) => {
      const res = await apiRequest("POST", "/api/user-clubs", data);
      if (!res.ok) {
        throw new Error("Failed to add user to club");
      }
      return res.json();
    },
    onSuccess: async () => {
      await refreshUserData();
      
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/clubs`] });
      }
      
      // Mark onboarding as complete
      if (user?.id) {
        try {
          const res = await apiRequest("PUT", `/api/users/${user.id}`, {
            onboardingCompleted: true
          });
          
          if (res.ok) {
            await refreshUserData();
            toast({
              title: "Setup complete!",
              description: "Your profile setup is complete. Welcome to Linx!",
            });
          }
        } catch (error) {
          console.error("Error completing onboarding:", error);
        }
      }
      
      // Navigate to dashboard
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding club membership",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle direct form submission for profile
  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateProfileMutation.mutate(formData);
  };

  // Handle club selection
  const handleClubSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clubId = formData.get('clubId') as string;
    
    if (user?.id && clubId) {
      addUserToClubMutation.mutate({
        userId: user.id,
        clubId: parseInt(clubId)
      });
    } else {
      toast({
        title: "Please select a club",
        description: "Please select an existing club or create a new one.",
        variant: "destructive",
      });
    }
  };

  // Skip club selection
  const skipClub = () => {
    if (user?.id) {
      apiRequest("PUT", `/api/users/${user.id}`, {
        onboardingCompleted: true
      }).then(async (res) => {
        if (res.ok) {
          await refreshUserData();
          
          toast({
            title: "Setup complete!",
            description: "Your profile setup is complete. Welcome to Linx!",
          });
          
          navigate("/dashboard");
        }
      }).catch(error => {
        console.error("Error completing onboarding:", error);
      });
    }
  };

  if (isUserLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-primary text-center">
            {showClubForm ? "Select Your Golf Club" : "Complete Your Profile"}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* Profile Form */}
          {!showClubForm && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
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
              
              <div>
                <label htmlFor="bio" className="block text-sm font-medium mb-1">About You</label>
                <textarea
                  id="bio"
                  name="bio"
                  defaultValue={user?.bio || ""}
                  placeholder="Tell us about your golfing experience, favorite courses, or handicap..."
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="w-full"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </form>
          )}
          
          {/* Club Selection Form */}
          {showClubForm && (
            <form onSubmit={handleClubSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="clubId" className="block text-sm font-medium mb-1">Select Your Golf Club</label>
                  <select
                    id="clubId"
                    name="clubId"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select a golf club</option>
                    {clubs && clubs.map((club: Club) => (
                      <option key={club.id} value={club.id}>
                        {club.name} - {club.location}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="pt-4 flex flex-col gap-4">
                  <Button
                    type="submit"
                    disabled={addUserToClubMutation.isPending}
                    className="w-full"
                  >
                    {addUserToClubMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining Club...
                      </>
                    ) : (
                      "Join Club"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}