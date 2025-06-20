import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { Loader2 } from "lucide-react";

// Simplified schema for email-only password reset request
const passwordResetRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type PasswordResetRequestValues = z.infer<typeof passwordResetRequestSchema>;

interface PasswordResetFormProps {
  switchToLogin: () => void;
  onSuccess?: () => void;
}

export default function PasswordResetForm({ switchToLogin, onSuccess }: PasswordResetFormProps) {
  const { requestPasswordReset, isLoading: authLoading } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  // Use either the auth context loading state or local submitting state
  const isLoading = authLoading || isSubmitting;

  const form = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: PasswordResetRequestValues) {
    setIsSubmitting(true);
    try {
      console.log("Password reset request submitting for:", data.email);
      
      // Call the auth context password reset function
      await requestPasswordReset(data.email);
      
      console.log("Password reset request successful");
      
      // Mark email as sent for UI feedback
      setEmailSent(true);
      
      // Show success toast (auth context may also show one, but this is more specific)
      toast({
        title: "Reset Link Sent",
        description: "If an account exists for this email, a password reset link has been sent.",
      });
      
      // Optionally call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Password reset request error:", error);
      
      // Handle specific errors
      let errorMessage = "Failed to send reset email. Please try again.";
      
      if (error.message?.includes("Email not found")) {
        errorMessage = "If an account exists for this email, a password reset link has been sent.";
      } else if (error.message?.includes("Email rate limit exceeded")) {
        errorMessage = "Too many reset requests. Please wait a moment and try again.";
      } else if (error.message?.includes("Invalid email")) {
        errorMessage = "Please enter a valid email address.";
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
        title: "Reset Request Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="px-1">
      <div className="mb-4 text-center">
        <h3 className="text-xl font-semibold text-gray-900">Reset Password</h3>
        <p className="text-sm text-gray-500 mt-1">
          {emailSent 
            ? "Check your email for reset instructions" 
            : "Enter your email to reset your password"}
        </p>
      </div>

      {!emailSent ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Display form-level errors */}
            {form.formState.errors.root && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">
                  {form.formState.errors.root.message}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSubmitting ? "Sending reset link..." : "Loading..."}
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        </Form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-700">
              <p className="font-medium">Reset link sent!</p>
              <p className="mt-1">
                If an account exists for this email, you'll receive a password reset link shortly. 
                Click the link in the email to reset your password.
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setEmailSent(false)}
            disabled={isLoading}
          >
            Send Another Reset Link
          </Button>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Remember your password?{" "}
          <Button
            variant="link"
            className="p-0 text-primary font-medium h-auto"
            onClick={switchToLogin}
            type="button"
            disabled={isLoading}
          >
            Back to Login
          </Button>
        </p>
      </div>
    </div>
  );
}