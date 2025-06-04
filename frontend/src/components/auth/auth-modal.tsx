import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import LoginForm from "./login-form";
import RegisterForm from "./register-form";
import PasswordResetForm from "./password-reset-form";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  view: "login" | "register" | "reset-password";
  setView: (view: "login" | "register" | "reset-password") => void;
}

export default function AuthModal({ isOpen, onClose, view, setView }: AuthModalProps) {
  // Determine the appropriate title based on the current view
  const getTitle = () => {
    switch(view) {
      case "login": return "Sign In";
      case "register": return "Sign Up";
      case "reset-password": return "Reset Password";
      default: return "Authentication";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" aria-describedby="auth-description">
        <DialogTitle className="sr-only">{getTitle()}</DialogTitle>
        <span id="auth-description" className="sr-only">Please enter your credentials to continue.</span>
        
        {view === "login" ? (
          <LoginForm 
            onSuccess={onClose} 
            switchToRegister={() => setView("register")} 
            switchToResetPassword={() => setView("reset-password")}
          />
        ) : view === "register" ? (
          <RegisterForm 
            onSuccess={onClose} 
            switchToLogin={() => setView("login")} 
          />
        ) : (
          <PasswordResetForm 
            onSuccess={onClose}
            switchToLogin={() => setView("login")} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
