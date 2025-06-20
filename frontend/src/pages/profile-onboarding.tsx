import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/use-auth";
import { useClubs, type Club } from "@/hooks/use-profile";
import { Loader2, Camera, Plus, MapPin, Building, ArrowRight, CheckCircle } from "lucide-react";
import { Helmet } from 'react-helmet';

// Steps enum for onboarding flow
enum OnboardingStep {
  PROFILE = 'profile',
  CLUB_SELECTION = 'club_selection',
  COMPLETE = 'complete'
}

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

// Interface for new club creation
interface NewClubData {
  name: string;
  location: string;
  description?: string;
}

export default function ProfileOnboarding() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, refreshUserData, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Current step state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.PROFILE);
  
  // Profile form state
  const [bio, setBio] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [newProfileImageUrl, setNewProfileImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Club selection state
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [showNewClubForm, setShowNewClubForm] = useState(false);
  const [newClubName, setNewClubName] = useState("");
  const [newClubLocation, setNewClubLocation] = useState("");
  const [newClubDescription, setNewClubDescription] = useState("");

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    navigate("/");
    return null;
  }

  // Fetch current profile data to pre-fill form
  const { data: profileData, isLoading: isLoadingProfile } = useQuery<ProfileData>({
    queryKey: [
      'supabase:profiles:single',
      { id: user.id }
    ],
    enabled: !!user?.id,
    onSuccess: (data) => {
      // Pre-fill form fields with current data
      setBio(data.bio || "");
      setImagePreview(data.profile_image_url || null);
      
      // If profile is already completed, skip to dashboard
      if (data.onboarding_completed) {
        navigate("/dashboard");
      }
    }
  });

  // Fetch clubs for selection
  const { data: clubs = [], isLoading: isLoadingClubs } = useClubs();

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
      console.log("Bucket name: profile-images");

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from('profile-images')
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
    mutationFn: async () => {
      const updateData: any = {
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Add new profile image URL if one was uploaded
      if (newProfileImageUrl) {
        updateData.profile_image_url = newProfileImageUrl;
      }

      console.log('🟢 M2: [updateProfileMutation] Starting database update with data:', updateData);
      console.log('🟢 M2: [updateProfileMutation] Target user ID:', user.id);

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.log('🔴 M2: [updateProfileMutation] Database update failed:', error);
        throw new Error(error.message);
      }

      console.log('🟢 M2: [updateProfileMutation] Database update successful, returned data:', data);
      return data;
    },
    onSuccess: async (data) => {
      console.log('🟢 M3: [updateProfileMutation.onSuccess] Profile update mutation succeeded');
      console.log('🟢 M3: [updateProfileMutation.onSuccess] Updated profile data:', data);
      
      await refreshUserData();
      console.log('🟢 M3: [updateProfileMutation.onSuccess] User data refreshed');
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['supabase:profiles:single', { id: user.id }] 
      });
      console.log('🟢 M3: [updateProfileMutation.onSuccess] Query cache invalidated');

      toast({
        title: "Profile updated",
        description: "Your profile information has been saved",
      });

      // Move to next step based on user type
      if (user.isHost) {
        console.log('🟢 M3: [updateProfileMutation.onSuccess] User is host, moving to club selection step');
        setCurrentStep(OnboardingStep.CLUB_SELECTION);
      } else {
        console.log('🟢 M3: [updateProfileMutation.onSuccess] User is guest, completing onboarding');
        // For guests, complete onboarding
        completeOnboarding();
      }
    },
    onError: (error: Error) => {
      console.log('🔴 M3: [updateProfileMutation.onError] Profile update mutation failed:', error);
      console.error('Profile update error:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create new club mutation
  const createClubMutation = useMutation({
    mutationFn: async (clubData: NewClubData) => {
      const { data, error } = await supabase
        .from('clubs')
        .insert({
          name: clubData.name,
          location: clubData.location,
          description: clubData.description || null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: (newClub) => {
      toast({
        title: "Club created",
        description: `${newClub.name} has been added to our directory`,
      });
      
      // Refresh clubs list
      queryClient.invalidateQueries({ 
        queryKey: ['supabase:clubs:select'] 
      });
      
      // Select the newly created club
      setSelectedClubId(newClub.id.toString());
      setShowNewClubForm(false);
      
      // Reset form
      setNewClubName("");
      setNewClubLocation("");
      setNewClubDescription("");
    },
    onError: (error: Error) => {
      console.error('Club creation error:', error);
      toast({
        title: "Failed to create club",
        description: error.message || "Failed to create club. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add user to club mutation
  const addUserToClubMutation = useMutation({
    mutationFn: async (clubId: number) => {
      const { data, error } = await supabase
        .from('user_clubs')
        .insert({
          user_id: user.id,
          club_id: clubId,
          member_since: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: async () => {
      toast({
        title: "Club affiliation saved",
        description: "You've been successfully affiliated with your club",
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['supabase:user_clubs:select'] 
      });
      
      // Complete onboarding
      await completeOnboarding();
    },
    onError: (error: Error) => {
      console.error('Club affiliation error:', error);
      toast({
        title: "Failed to join club",
        description: error.message || "Failed to join club. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Complete onboarding mutation
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      console.log('🟢 M4: [completeOnboardingMutation] Starting onboarding completion');
      console.log('🟢 M4: [completeOnboardingMutation] User ID:', user.id);
      console.log('🟢 M4: [completeOnboardingMutation] Current user onboarding status:', user.onboardingCompleted);

      const updateData = {
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      console.log('🟢 M4: [completeOnboardingMutation] Updating profile with data:', updateData);

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.log('🔴 M4: [completeOnboardingMutation] Database update failed:', error);
        throw new Error(error.message);
      }

      console.log('🟢 M4: [completeOnboardingMutation] Database update successful, returned data:', data);
      console.log('🟢 M4: [completeOnboardingMutation] Onboarding completed status in returned data:', data.onboarding_completed);
      return data;
    },
    onSuccess: async (data) => {
      console.log('🟢 M5: [completeOnboardingMutation.onSuccess] Onboarding completion mutation succeeded');
      console.log('🟢 M5: [completeOnboardingMutation.onSuccess] Final profile data:', data);
      console.log('🟢 M5: [completeOnboardingMutation.onSuccess] Final onboarding_completed status:', data.onboarding_completed);
      
      queryClient.invalidateQueries({ 
        queryKey: ['supabase:profiles:single', { id: user.id }] 
      });
      console.log('🟢 M5: [completeOnboardingMutation.onSuccess] Query cache invalidated');

      toast({
        title: "Welcome to ClubKey!",
        description: "Your onboarding is complete. Let's get started!",
      });

      console.log('🟢 M5: [completeOnboardingMutation.onSuccess] Refreshing user data...');
      // CRITICAL CHANGE: Capture the returned fresh user object
      const refreshedUser = await refreshUserData();
      console.log('🟢 M5: [completeOnboardingMutation.onSuccess] User data refreshed, returned user:', refreshedUser);
      console.log('🟢 M5: [completeOnboardingMutation.onSuccess] Returned user type:', typeof refreshedUser);
      console.log('🟢 M5: [completeOnboardingMutation.onSuccess] Returned user onboardingCompleted:', refreshedUser?.onboardingCompleted);
      
      // FORCE FIX: Since refreshUserData seems to return wrong object, let's construct the correct one from database data
      const correctedUser = {
        ...user, // Keep existing user structure
        onboardingCompleted: data.onboarding_completed === true, // Use the database response directly
        bio: data.bio,
        profileImage: data.profile_image_url,
        username: data.username,
        firstName: data.first_name,
        lastName: data.last_name,
      };
      
      console.log('🔄 M5: [completeOnboardingMutation.onSuccess] Constructed corrected user:', correctedUser);
      console.log('🔄 M5: [completeOnboardingMutation.onSuccess] Corrected user onboardingCompleted:', correctedUser.onboardingCompleted);
      
      // Force update the auth context with corrected user
      updateUser(correctedUser);
      console.log('🔄 M5: [completeOnboardingMutation.onSuccess] Auth context manually updated');
      
      // Double check - use the corrected user for navigation decision
      if (correctedUser.onboardingCompleted) {
        console.log('🟢 M6: [completeOnboardingMutation.onSuccess] Onboarding confirmed from corrected data. Navigating to dashboard...');
        navigate("/dashboard", { replace: true });
      } else {
        console.error('🔴 M6: [completeOnboardingMutation.onSuccess] Onboarding completion failed even in corrected data. Halting redirect.');
        console.error('🔴 M6: [completeOnboardingMutation.onSuccess] Database response onboarding_completed:', data.onboarding_completed);
        toast({
          title: "Update Error",
          description: "Could not confirm profile completion. Please try refreshing the page.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.log('🔴 M5: [completeOnboardingMutation.onError] Onboarding completion mutation failed:', error);
      console.error('Onboarding completion error:', error);
      toast({
        title: "Error completing setup",
        description: error.message || "Failed to complete onboarding.",
        variant: "destructive",
      });
    },
  });

  // Helper function to complete onboarding
  const completeOnboarding = () => {
    console.log('🟢 M4: [completeOnboarding] Helper function called, triggering completeOnboardingMutation');
    completeOnboardingMutation.mutate();
  };

  // Handle profile form submission
  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const updateData = {
      bio: bio.trim() || null,
      updated_at: new Date().toISOString(),
      ...(newProfileImageUrl && { profile_image_url: newProfileImageUrl }),
    };

    console.log('🟢 M1: [handleProfileSubmit] Preparing to update profile with data:', updateData);
    console.log('🟢 M1: [handleProfileSubmit] User ID:', user.id);
    console.log('🟢 M1: [handleProfileSubmit] User isHost:', user.isHost);
    updateProfileMutation.mutate();
  };

  // Handle club selection
  const handleClubSelection = () => {
    if (!selectedClubId) {
      toast({
        title: "Please select a club",
        description: "Choose a club from the list or create a new one.",
        variant: "destructive",
      });
      return;
    }

    addUserToClubMutation.mutate(parseInt(selectedClubId));
  };

  // Handle new club creation
  const handleCreateClub = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!newClubName.trim() || !newClubLocation.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide the club name and location.",
        variant: "destructive",
      });
      return;
    }

    createClubMutation.mutate({
      name: newClubName.trim(),
      location: newClubLocation.trim(),
      description: newClubDescription.trim() || undefined,
    });
  };

  // Skip club selection (for hosts who want to add it later)
  const skipClubSelection = () => {
    completeOnboarding();
  };

  // Loading state for initial profile fetch
  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-neutral-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h1 className="text-2xl font-bold text-neutral-dark mb-2">Profile not found</h1>
          <p className="text-neutral-medium mb-4">Unable to load your profile data</p>
          <Button onClick={() => navigate("/?skipOnboarding=true")}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const getInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    return profileData.username?.substring(0, 2).toUpperCase() || "U";
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case OnboardingStep.PROFILE:
        return "Complete Your Profile";
      case OnboardingStep.CLUB_SELECTION:
        return "Select Your Golf Club";
      case OnboardingStep.COMPLETE:
        return "Welcome to ClubKey!";
      default:
        return "Profile Setup";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case OnboardingStep.PROFILE:
        return "Add your bio and profile picture to help others connect with you";
      case OnboardingStep.CLUB_SELECTION:
        return "Choose the golf club you're affiliated with to start listing tee times";
      case OnboardingStep.COMPLETE:
        return "Your profile setup is complete!";
      default:
        return "";
    }
  };

  return (
    <>
      <Helmet>
        <title>Profile Setup | ClubKey</title>
        <meta name="description" content="Complete your ClubKey profile setup" />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className={`flex items-center space-x-2 ${
                currentStep === OnboardingStep.PROFILE ? 'text-primary' : 'text-green-600'
              }`}>
                {currentStep === OnboardingStep.PROFILE ? (
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                ) : (
                  <CheckCircle className="w-8 h-8" />
                )}
                <span className="font-medium">Profile</span>
              </div>
              
              {user.isHost && (
                <>
                  <ArrowRight className="w-4 h-4 text-neutral-medium" />
                  <div className={`flex items-center space-x-2 ${
                    currentStep === OnboardingStep.CLUB_SELECTION ? 'text-primary' : 
                    currentStep === OnboardingStep.COMPLETE ? 'text-green-600' : 'text-neutral-medium'
                  }`}>
                    {currentStep === OnboardingStep.CLUB_SELECTION ? (
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                    ) : currentStep === OnboardingStep.COMPLETE ? (
                      <CheckCircle className="w-8 h-8" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-light text-neutral-medium flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                    )}
                    <span className="font-medium">Club</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">{getStepTitle()}</CardTitle>
              <p className="text-neutral-medium text-center">
                {getStepDescription()}
              </p>
            </CardHeader>
            
            <CardContent>
              {/* Profile Step */}
              {currentStep === OnboardingStep.PROFILE && (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
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
                          {isUploadingImage ? "Uploading..." : "Add Picture"}
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

                    <div className="text-center">
                      <h3 className="text-lg font-semibold">
                        {user.firstName} {user.lastName}
                      </h3>
                      {user.isHost && (
                        <p className="text-sm text-primary font-medium">Host</p>
                      )}
                    </div>
                  </div>

                  {/* Bio Section */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">About You</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={user.isHost ? 
                        "Tell potential guests about your golfing experience, favorite courses, or what makes playing with you special..." :
                        "Tell hosts about your golfing experience, skill level, or what you're looking for in a golfing partner..."
                      }
                      rows={4}
                      className="resize-none"
                    />
                    <p className="text-xs text-neutral-medium">
                      {user.isHost ? 
                        "Help guests know what to expect when booking with you" :
                        "Help hosts understand your playing style and experience level"
                      }
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending || isUploadingImage}
                    className="w-full"
                  >
                    {updateProfileMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {user.isHost ? "Continue to Club Selection" : "Complete Setup"}
                  </Button>
                </form>
              )}

              {/* Club Selection Step */}
              {currentStep === OnboardingStep.CLUB_SELECTION && user.isHost && (
                <div className="space-y-6">
                  {!showNewClubForm ? (
                    <>
                      {/* Existing Club Selection */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="clubSelect">Choose Your Golf Club</Label>
                          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a golf club" />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingClubs ? (
                                <SelectItem value="loading" disabled>
                                  Loading clubs...
                                </SelectItem>
                              ) : (
                                clubs.map((club) => (
                                  <SelectItem key={club.id} value={club.id.toString()}>
                                    <div className="flex items-center space-x-2">
                                      <Building className="h-4 w-4" />
                                      <div>
                                        <div className="font-medium">{club.name}</div>
                                        <div className="text-sm text-neutral-medium flex items-center">
                                          <MapPin className="h-3 w-3 mr-1" />
                                          {club.location}
                                        </div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="text-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowNewClubForm(true)}
                            className="flex items-center space-x-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>My club isn't listed</span>
                          </Button>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col space-y-3">
                        <Button
                          onClick={handleClubSelection}
                          disabled={!selectedClubId || addUserToClubMutation.isPending}
                          className="w-full"
                        >
                          {addUserToClubMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Join Selected Club
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={skipClubSelection}
                          disabled={completeOnboardingMutation.isPending}
                          className="w-full"
                        >
                          Skip for Now
                        </Button>
                      </div>
                    </>
                  ) : (
                    /* New Club Form */
                    <form onSubmit={handleCreateClub} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="clubName">Club Name *</Label>
                        <Input
                          id="clubName"
                          type="text"
                          value={newClubName}
                          onChange={(e) => setNewClubName(e.target.value)}
                          placeholder="Pebble Beach Golf Links"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="clubLocation">Location *</Label>
                        <Input
                          id="clubLocation"
                          type="text"
                          value={newClubLocation}
                          onChange={(e) => setNewClubLocation(e.target.value)}
                          placeholder="Pebble Beach, CA"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="clubDescription">Description (Optional)</Label>
                        <Textarea
                          id="clubDescription"
                          value={newClubDescription}
                          onChange={(e) => setNewClubDescription(e.target.value)}
                          placeholder="Brief description of the golf club..."
                          rows={3}
                          className="resize-none"
                        />
                      </div>

                      <div className="flex flex-col space-y-3">
                        <Button
                          type="submit"
                          disabled={createClubMutation.isPending}
                          className="w-full"
                        >
                          {createClubMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Create Club
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowNewClubForm(false)}
                          className="w-full"
                        >
                          Back to Selection
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}