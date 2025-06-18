import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface CheckEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string | null;
}

export default function CheckEmailModal({ isOpen, onClose, email }: CheckEmailModalProps) {
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    if (!email) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        console.error("Error resending verification email:", error);
        toast({
          title: "Resend Failed",
          description: error.message || "Failed to resend verification email. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email Sent!",
          description: "Verification email has been resent. Please check your inbox.",
        });
      }
    } catch (error: any) {
      console.error("Error resending verification email:", error);
      toast({
        title: "Resend Failed",
        description: "Failed to resend verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" aria-describedby="check-email-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
            Verify Your Email
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-4 py-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Registration Successful!
            </h3>
            <p id="check-email-description" className="text-sm text-gray-600 leading-relaxed">
              We've sent a verification link to{" "}
              <span className="font-medium text-gray-900">{email}</span>.{" "}
              Please check your inbox (and spam folder) and click the link to activate your account before logging in.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={onClose} className="w-full">
            Okay, I'll check my email
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleResendEmail}
            disabled={isResending || !email}
            className="w-full"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resending...
              </>
            ) : (
              "Resend Verification Email"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 