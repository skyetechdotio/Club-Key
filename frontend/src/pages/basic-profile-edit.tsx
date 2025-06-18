import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Camera, Upload } from "lucide-react";
import { Helmet } from 'react-helmet';

// Interface for profile data from Supabase
interface ProfileData {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  profile_image_url?: string;
  is_host: boolean;
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
}

// Interface for form data
interface ProfileUpdateData {
  first_name: string;
  last_name: string;
  bio?: string;
  profile_image_url?: string;
  updated_at: string;
}

export default function BasicProfileEdit() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, refreshUserData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for form and image handling
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newProfileImageUrl, setNewProfileImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    navigate("/");
    return null;
  }

  // Fetch current profile data to pre-fill form
  const { data: profileData, isLoading: isLoadingProfile, error: profileError } = useQuery<ProfileData>({
    queryKey: [
      'supabase:profiles:single',
      { id: user.id }
    ],
    enabled: !!user?.id,
    onSuccess: (data) => {
      // Pre-fill form fields with current data
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setBio(data.bio || "");
      setImagePreview(data.profile_image_url || null);
    }
  });

  // Handle file selection and upload to Supabase Storage
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);

    try {
      // Generate unique file path: {userId}/profile.{extension}
      const fileExtension = file.name.split('.').pop();
      const fileName = `profile.${fileExtension}`;
      const filePath = `${user.id}/${fileName}`;

      console.log("Attempting to upload to Supabase Storage:");
      console.log("Current user.id:", user.id);
      console.log("Generated filePath:", filePath);
      console.log("Bucket name: profile-pictures");

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;

      // Update local state
      setNewProfileImageUrl(publicUrl);
      setImagePreview(publicUrl);

      toast({
        title: "Image uploaded",
        description: "Your profile picture has been uploaded successfully",
      });

    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updateData: ProfileUpdateData) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async () => {
      // Refresh user data in AuthContext
      await refreshUserData();
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['supabase:profiles:single', { id: user.id }] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['supabase:profiles:select'] 
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });

      // Navigate back to profile page
      navigate(`/profile/${user.id}`);
    },
    onError: (error: Error) => {
      console.error('Profile update error:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate required fields
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide your first and last name.",
        variant: "destructive",
      });
      return;
    }

    // Prepare update data
    const updateData: ProfileUpdateData = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      bio: bio.trim() || null,
      updated_at: new Date().toISOString(),
    };

    // Add new profile image URL if one was uploaded
    if (newProfileImageUrl) {
      updateData.profile_image_url = newProfileImageUrl;
    }

    updateProfileMutation.mutate(updateData);
  };

  // Loading state for initial profile fetch
  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-neutral-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state for profile fetch
  if (profileError || !profileData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-2xl font-bold text-neutral-dark mb-2">Failed to load profile</h1>
          <p className="text-neutral-medium mb-4">Unable to fetch your profile data</p>
          <Button onClick={() => navigate(`/profile/${user.id}`)}>
            Back to Profile
          </Button>
        </div>
      </div>
    );
  }

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`;
    }
    return profileData.username?.substring(0, 2).toUpperCase() || "U";
  };

  return (
    <>
      <Helmet>
        <title>Edit Profile | ClubKey</title>
        <meta name="description" content="Edit your ClubKey profile information and update your profile picture" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Edit Your Profile</CardTitle>
              <p className="text-neutral-medium text-center">
                Update your profile information to help connect with other golfers
              </p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Profile Picture Section */}
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={imagePreview || undefined} alt="Profile picture" />
                    <AvatarFallback className="bg-primary text-white text-2xl">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex flex-col items-center space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="flex items-center space-x-2"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      <span>
                        {isUploadingImage ? "Uploading..." : "Change Picture"}
                      </span>
                    </Button>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    
                    <p className="text-xs text-neutral-medium text-center">
                      Upload a profile picture (PNG, JPG, max 5MB)
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself and your golfing experience..."
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-neutral-medium">
                    Share your golfing experience, favorite courses, or anything that helps others connect with you
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => navigate(`/profile/${user.id}`)}
                    disabled={updateProfileMutation.isPending}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending || isUploadingImage}
                  >
                    {updateProfileMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}