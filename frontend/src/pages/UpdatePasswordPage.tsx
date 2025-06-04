import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, AlertCircle, CheckCircle } from "lucide-react";

const updatePasswordSchema = z
  .object({
    newPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string().min(8, { message: "Please confirm your password" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

export default function UpdatePasswordPage() {
  const { user, updatePassword, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidRecoverySession, setIsValidRecoverySession] = useState<boolean | null>(null);

  // Use either the auth context loading state or local submitting state
  const isLoading = authLoading || isSubmitting;

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Check if this is a valid password recovery session
  useEffect(() => {
    // Give some time for the auth state to settle after redirect
    const timer = setTimeout(() => {
      if (user) {
        // User is authenticated, which should be the case for password recovery
        setIsValidRecoverySession(true);
      } else {
        // No authenticated user, likely invalid or expired recovery session
        setIsValidRecoverySession(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [user]);

  // Handle form submission
  async function onSubmit(data: UpdatePasswordFormValues) {
    if (!user) {
      toast({
        title: "Session Error",
        description: "You must be authenticated to update your password.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Updating password for user:", user.id);
      
      // Call the auth context password update function
      await updatePassword(data.newPassword);
      
      console.log("Password update successful");
      
      // Show success toast
      toast({
        title: "Password Updated Successfully!",
        description: "Your password has been updated. You can now log in with your new password.",
      });
      
      // Navigate to home page after a short delay to let user see the success message
      setTimeout(() => {
        navigate("/");
      }, 2000);
      
    } catch (error: any) {
      console.error("Password update error:", error);
      
      // Handle specific Supabase errors
      let errorMessage = "Failed to update password. Please try again.";
      
      if (error.message?.includes("New password should be different")) {
        errorMessage = "New password must be different from your current password.";
      } else if (error.message?.includes("Password should be at least")) {
        errorMessage = "Password must be at least 6 characters long.";
      } else if (error.message?.includes("session_not_found")) {
        errorMessage = "Your password reset session has expired. Please request a new reset link.";
      } else if (error.message?.includes("invalid_credentials")) {
        errorMessage = "Invalid password reset session. Please request a new reset link.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Set form-level error for immediate user feedback
      form.setError("root", {
        type: "manual",
        message: errorMessage,
      });
      
      // Also show toast for consistency
      toast({
        title: "Password Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show loading state while determining session validity
  if (isValidRecoverySession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-600">Verifying reset link...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state for invalid recovery session
  if (!isValidRecoverySession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Invalid Reset Link
            </CardTitle>
            <CardDescription className="text-gray-600">
              This password reset link is invalid or has expired. Please request a new password reset.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={() => navigate("/")} 
                className="w-full"
              >
                Go to Home
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate("/?auth=reset-password")} 
                className="w-full"
              >
                Request New Reset Link
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show the password update form for valid recovery sessions
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Update Your Password
          </CardTitle>
          <CardDescription className="text-gray-600">
            Enter your new password below. Make sure it's strong and secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Display form-level errors */}
              {form.formState.errors.root && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <div className="text-sm text-red-700">
                      {form.formState.errors.root.message}
                    </div>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
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
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSubmitting ? "Updating password..." : "Loading..."}
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Update Password
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remember your password?{" "}
              <Button
                variant="link"
                className="p-0 text-primary font-medium h-auto"
                onClick={() => navigate("/")}
                type="button"
                disabled={isLoading}
              >
                Back to Home
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 