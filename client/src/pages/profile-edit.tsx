import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { Loader2, Upload } from "lucide-react";

export default function ProfileEdit() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Use refs for direct DOM access to avoid React's state handling
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  
  // State only for things we need to display or track
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState("");
  
  // Use auth context
  const { user, isLoading: isUserLoading, refreshUserData } = useAuth();

  // Set initial values of inputs directly using DOM
  useEffect(() => {
    if (user && firstNameRef.current && lastNameRef.current && bioRef.current) {
      console.log("Setting initial form values:", user);
      
      // Set input values directly in the DOM
      firstNameRef.current.value = user.firstName || "";
      lastNameRef.current.value = user.lastName || "";
      bioRef.current.value = user.bio || "";
      
      if (user.profileImage) {
        setImagePreview(user.profileImage);
        setProfileImage(user.profileImage);
      }
    }
  }, [user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Submitting data:", data);
      const res = await apiRequest("PUT", `/api/users/${user?.id}`, data);
      if (!res.ok) {
        throw new Error("Failed to update profile");
      }
      return res.json();
    },
    onSuccess: async () => {
      await refreshUserData();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}`] });
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      
      navigate(`/profile/${user?.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get values directly from refs
    const firstName = firstNameRef.current?.value || "";
    const lastName = lastNameRef.current?.value || "";
    const bio = bioRef.current?.value || "";
    
    if (!firstName || !lastName) {
      toast({
        title: "Missing information",
        description: "Please provide your first and last name.",
        variant: "destructive",
      });
      return;
    }
    
    updateProfileMutation.mutate({
      firstName,
      lastName,
      bio,
      profileImage,
    });
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setProfileImage(base64String);
      };
      reader.readAsDataURL(file);
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
    <div className="container mx-auto px-4 py-8">
      <Card className="border-2 border-primary/10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl lg:text-3xl font-bold">Edit Your Profile</CardTitle>
          <CardDescription>
            Update your Linx profile information to help you connect with other golfers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center space-y-4">
              <label htmlFor="profile-picture">Profile Picture</label>
              <Avatar className="h-32 w-32">
                <AvatarImage src={imagePreview || ""} alt="Profile" />
                <AvatarFallback className="bg-primary/20">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <label 
                  htmlFor="profile-picture" 
                  className="cursor-pointer flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed rounded-md border-primary/30 hover:border-primary/50"
                >
                  <Upload className="h-4 w-4" />
                  Upload Image
                </label>
                <input
                  id="profile-picture"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            {/* Name Fields - using plain HTML elements instead of shadcn components */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium mb-1">First Name</label>
                <input 
                  ref={firstNameRef}
                  id="firstName"
                  type="text"
                  placeholder="John" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-1">Last Name</label>
                <input
                  ref={lastNameRef}
                  id="lastName"
                  type="text"
                  placeholder="Doe" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Bio Field - using plain HTML textarea */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio</label>
              <textarea
                ref={bioRef}
                id="bio"
                placeholder="Tell us about yourself and your golfing experience..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none min-h-[100px]"
              ></textarea>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Profile
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-4">
          <div className="text-xs text-muted-foreground">
            You can always update your profile information later.
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/profile/${user?.id}`)}
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}