import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
  remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess: () => void;
  switchToRegister: () => void;
  switchToResetPassword: () => void;
}

export default function LoginForm({ onSuccess, switchToRegister, switchToResetPassword }: LoginFormProps) {
  const { login, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use either the auth context loading state or local submitting state
  const isLoading = authLoading || isSubmitting;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsSubmitting(true);
    try {
      console.log("Login form submitting with:", data.email);
      
      // Call the auth context login function
      await login(data.email, data.password);
      
      console.log("Login successful in form handler");
      
      // Show success toast (auth context may also show one, but this is more specific)
      toast({
        title: "Welcome back!",
        description: "You have been logged in successfully",
      });
      
      // Call the success callback to close modal or redirect
      onSuccess();
    } catch (error: any) {
      console.error("Login error in form handler:", error);
      
      // The auth context already shows a toast, but we can show a more specific one here
      // or handle specific error cases differently
      let errorMessage = "Failed to log in. Please try again.";
      
      // Handle specific Supabase auth errors
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please check your credentials.";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Please check your email and confirm your account before logging in.";
      } else if (error.message?.includes("Too many requests")) {
        errorMessage = "Too many login attempts. Please wait a moment and try again.";
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
        title: "Login Failed",
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
        <h3 className="text-xl font-semibold text-gray-900">Sign In</h3>
        <p className="text-sm text-gray-500 mt-1">Welcome back to ClubKey!</p>
      </div>

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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Button
                    variant="link"
                    className="px-0 text-sm font-medium text-primary h-auto"
                    type="button"
                    onClick={switchToResetPassword}
                    disabled={isLoading}
                  >
                    Forgot password?
                  </Button>
                </div>
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
            name="remember"
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
                  <FormLabel className="font-normal">Remember me</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                {isSubmitting ? "Signing in..." : "Loading..."}
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </Form>

      {/* Social login section removed */}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <Button
            variant="link"
            className="p-0 text-primary font-medium h-auto"
            onClick={switchToRegister}
            type="button"
            disabled={isLoading}
          >
            Sign up
          </Button>
        </p>
      </div>
    </div>
  );
}
