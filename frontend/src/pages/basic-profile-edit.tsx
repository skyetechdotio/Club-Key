import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";

export default function BasicProfileEdit() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user, isLoading: isUserLoading, refreshUserData } = useAuth();
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const data = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        bio: formData.get('bio'),
        profileImage: user?.profileImage || '',
      };
      
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
  
  // Handle form submission directly using FormData
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    
    if (!firstName || !lastName) {
      toast({
        title: "Missing information",
        description: "Please provide your first and last name.",
        variant: "destructive",
      });
      return;
    }
    
    updateProfileMutation.mutate(formData);
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
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center mb-2">Edit Your Profile</h1>
        <p className="text-neutral-500 text-center mb-6">
          Update your Linx profile information to help you connect with other golfers.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 mb-4">
              {user?.profileImage ? (
                <img 
                  src={user.profileImage} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-2xl font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-1">First Name</label>
              <input 
                type="text"
                id="firstName"
                name="firstName"
                defaultValue={user?.firstName || ""}
                placeholder="John"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                required
              />
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-1">Last Name</label>
              <input 
                type="text"
                id="lastName"
                name="lastName"
                defaultValue={user?.lastName || ""}
                placeholder="Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-1">Bio</label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={user?.bio || ""}
              placeholder="Tell us about yourself and your golfing experience..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div className="flex justify-between pt-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate(`/profile/${user?.id}`)}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}