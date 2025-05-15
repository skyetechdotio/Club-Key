import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Step 1: Request password reset
const passwordResetRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Step 2: Confirm with token and new password
const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordResetRequestValues = z.infer<typeof passwordResetRequestSchema>;
type PasswordResetConfirmValues = z.infer<typeof passwordResetConfirmSchema>;

interface PasswordResetFormProps {
  switchToLogin: () => void;
  onSuccess?: () => void;
}

export default function PasswordResetForm({ switchToLogin }: PasswordResetFormProps) {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Step 1: Request password reset
  const requestForm = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: {
      email: "",
    },
  });

  // Step 2: Confirm with token and new password
  const confirmForm = useForm<PasswordResetConfirmValues>({
    resolver: zodResolver(passwordResetConfirmSchema),
    defaultValues: {
      token: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onRequestSubmit(data: PasswordResetRequestValues) {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/auth/reset-password", data);
      const result = await response.json();
      toast({
        title: "Reset request sent",
        description: "If an account exists with that email, you'll receive further instructions.",
      });
      setStep('confirm');
    } catch (error) {
      toast({
        title: "Request failed",
        description: "Could not process your reset request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onConfirmSubmit(data: PasswordResetConfirmValues) {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/auth/reset-password/confirm", data);
      const result = await response.json();
      toast({
        title: "Password reset successful",
        description: "Your password has been updated. You can now log in with your new password.",
      });
      switchToLogin();
    } catch (error) {
      toast({
        title: "Reset failed",
        description: "Could not reset your password. Token may be invalid or expired.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {step === 'request' 
            ? "Enter your email to reset your password" 
            : "Enter the reset token and your new password"}
        </p>
      </div>

      {step === 'request' ? (
        <Form {...requestForm}>
          <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
            <FormField
              control={requestForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...confirmForm}>
          <form onSubmit={confirmForm.handleSubmit(onConfirmSubmit)} className="space-y-4">
            <FormField
              control={confirmForm.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reset Token</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the token from email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={confirmForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={confirmForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </Form>
      )}

      <div className="text-center">
        <Button variant="link" onClick={switchToLogin}>
          Back to Login
        </Button>
      </div>
    </div>
  );
}