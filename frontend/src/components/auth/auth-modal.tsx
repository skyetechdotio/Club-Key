import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import LoginForm from "./login-form";
import RegisterForm from "./register-form";
import PasswordResetForm from "./password-reset-form";

interface AuthModalProps {
  isOpen: boolean;
  onClose: (result?: { emailVerificationPending?: boolean; email?: string }) => void;
  view: "login" | "register" | "reset-password";
  setView: (view: "login" | "register" | "reset-password") => void;
}

export default function AuthModal({ isOpen, onClose, view, setView }: AuthModalProps) {
  console.log('🔍 [AuthModal] Rendered with:', { isOpen, view });
  
  // Determine the appropriate title based on the current view
  const getTitle = () => {
    switch(view) {
      case "login": return "Sign In";
      case "register": return "Sign Up";
      case "reset-password": return "Reset Password";
      default: return "Authentication";
    }
  };

  // Handle dialog close (without result)
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">{getTitle()}</DialogTitle>
        <DialogDescription className="sr-only">Please enter your credentials to continue.</DialogDescription>
        
        {view === "login" ? (
          <LoginForm 
            onSuccess={() => onClose()} 
            switchToRegister={() => setView("register")} 
            switchToResetPassword={() => setView("reset-password")}
          />
        ) : view === "register" ? (
          <RegisterForm 
            onSuccess={(result) => onClose(result)} 
            switchToLogin={() => setView("login")} 
          />
        ) : (
          <PasswordResetForm 
            onSuccess={() => onClose()}
            switchToLogin={() => setView("login")} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
