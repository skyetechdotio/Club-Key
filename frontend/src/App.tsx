import { useState, useEffect } from "react";
import { Switch, Route, useLocation, useRoute, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/auth-context";
import { AuthProvider } from "@/context/auth-context";
import { useAuth } from "@/hooks/use-auth";
import { ChatProvider } from "@/context/chat-context";
import ScrollRestoration from "@/components/scroll-restoration";
import Navbar from "@/layouts/Navbar";
import Footer from "@/layouts/Footer";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import TeeTimesPage from "@/pages/tee-times";
import TeeTimeDetailsPage from "@/pages/tee-time-details";
import ProfilePage from "@/pages/profile";
import ProfileOnboarding from "@/pages/profile-onboarding";
import ProfileEdit from "@/pages/profile-edit";
import BasicProfileEdit from "@/pages/basic-profile-edit";
import Dashboard from "@/pages/dashboard";
import CreateListing from "@/pages/create-listing";
import EditListingPage from "@/pages/EditListingPage";
import CheckoutPage from "@/pages/checkout";
import PreCheckoutPage from "@/pages/pre-checkout";
import MessagesPage from "@/pages/messages";
import NotificationsPage from "@/pages/notifications";
import AboutPage from "@/pages/about";
import PressPage from "@/pages/press";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TermsOfServicePage from "@/pages/terms-of-service";
import CookiePolicyPage from "@/pages/cookie-policy";
import ContactPage from "@/pages/contact";
import HelpPage from "@/pages/help";
import UpdatePasswordPage from "@/pages/UpdatePasswordPage";
import AuthModal from "@/components/auth/auth-modal";
import CheckEmailModal from "@/components/auth/CheckEmailModal";
import SanityCheckComponent from "@/components/_dev_examples/SanityCheckComponent";
import { Loader2 } from "lucide-react";

// Protected Route component
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType, path: string }) {
  const { user, isLoading } = useAuth();
  const [matches] = useRoute(rest.path);

  // Debug information
  console.log("ProtectedRoute check:", {
    path: rest.path,
    matches,
    isLoading,
    user,
    onboardingCompleted: user?.onboardingCompleted
  });

  if (isLoading) {
    return matches ? (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ) : null;
  }

  if (!user && matches) {
    console.log("User not authenticated, redirecting to home");
    return <Redirect to="/" />;
  }

  // Check if user needs to complete onboarding
  if (user && !user.onboardingCompleted && matches && rest.path !== "/onboarding") {
    console.log("User needs onboarding, redirecting to /onboarding");
    return <Redirect to="/onboarding" />;
  }

  return <Component />;
}

// Host Only Route component
function HostOnlyRoute({ component: Component, ...rest }: { component: React.ComponentType, path: string }) {
  const { user, isLoading } = useAuth();
  const [matches] = useRoute(rest.path);

  if (isLoading) {
    return matches ? (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ) : null;
  }

  if ((!user || !user.isHost) && matches) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router({ openAuthModal }: { openAuthModal: (view: "login" | "register" | "reset-password") => void }) {
  const [location, navigate] = useLocation();
  const isHomePage = location === "/";
  const { user, isLoading } = useAuth();

  // Determine if navbar and footer should be shown
  const hideNavbar = location === "/onboarding" || location === "/update-password";
  const hideFooter = hideNavbar || isHomePage;
  
  // Handle onboarding redirection and query parameter auth modal
  useEffect(() => {
    // Parse query parameters
    const searchParams = new URLSearchParams(window.location.search);
    const authParam = searchParams.get('auth');
    
    // Handle auth query parameter (e.g., ?auth=reset-password)
    if (authParam && (authParam === 'login' || authParam === 'register' || authParam === 'reset-password')) {
      console.log("Opening auth modal from query parameter:", authParam);
      openAuthModal(authParam as "login" | "register" | "reset-password");
      
      // Clean up URL by removing query parameter
      const cleanPath = location.split('?')[0];
      navigate(cleanPath, { replace: true });
      
      // Important: Return early here if we opened a modal, so we don't immediately try to redirect for onboarding
      return;
    }
    
    // Handle onboarding redirection for authenticated users
    if (user && !user.onboardingCompleted && location !== "/onboarding" && location !== "/update-password") {
      console.log("User needs onboarding, redirecting to /onboarding");
      navigate("/onboarding", { replace: true });
    }
  }, [user, location, openAuthModal, navigate]);

  // Show loading spinner until auth state is determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {!hideNavbar && <Navbar />}
      <main className={`flex-grow ${hideNavbar || isHomePage ? 'pt-0' : 'pt-4'}`}>
        <Switch>
          <Route path="/" component={Home} />
          
          {/* Password Reset Page - No auth required, handles its own session validation */}
          <Route path="/update-password" component={UpdatePasswordPage} />
          
          {/* Sanity Check Route for Testing TanStack Query + Supabase Integration */}
          <Route path="/sanity-check" component={SanityCheckComponent} />
          
          <Route path="/tee-times" component={TeeTimesPage} />
          <Route path="/tee-times/:id" component={TeeTimeDetailsPage} />
          <Route path="/profile/:id">
            {params => {
              const id = parseInt(params.id);
              return !isNaN(id) ? <ProfilePage /> : <Redirect to="/" />;
            }}
          </Route>
          
          {/* Onboarding routes */}
          <Route path="/onboarding" component={ProfileOnboarding} />
          <Route path="/profile-onboarding">
            <ProtectedRoute path="/profile-onboarding" component={ProfileOnboarding} />
          </Route>
          
          {/* Protected routes */}
          <Route path="/profile-edit">
            <ProtectedRoute path="/profile-edit" component={BasicProfileEdit} />
          </Route>
          <Route path="/dashboard">
            <ProtectedRoute path="/dashboard" component={Dashboard} />
          </Route>
          <Route path="/pre-checkout/:teeTimeId">
            <ProtectedRoute path="/pre-checkout/:teeTimeId" component={PreCheckoutPage} />
          </Route>
          <Route path="/checkout/:bookingId">
            <ProtectedRoute path="/checkout/:bookingId" component={CheckoutPage} />
          </Route>
          <Route path="/messages">
            <ProtectedRoute path="/messages" component={MessagesPage} />
          </Route>
          <Route path="/messages/:userId">
            <ProtectedRoute path="/messages/:userId" component={MessagesPage} />
          </Route>
          <Route path="/notifications">
            <ProtectedRoute path="/notifications" component={NotificationsPage} />
          </Route>
          
          {/* Host-only routes */}
          <Route path="/create-listing">
            <HostOnlyRoute path="/create-listing" component={CreateListing} />
          </Route>
          <Route path="/edit-listing/:listingId">
            <HostOnlyRoute path="/edit-listing/:listingId" component={EditListingPage} />
          </Route>
          
          {/* Standard pages */}
          <Route path="/about" component={AboutPage} />
          <Route path="/press" component={PressPage} />
          <Route path="/privacy-policy" component={PrivacyPolicyPage} />
          <Route path="/terms-of-service" component={TermsOfServicePage} />
          <Route path="/cookie-policy" component={CookiePolicyPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/help" component={HelpPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<"login" | "register" | "reset-password">("login");
  const [showCheckEmailModal, setShowCheckEmailModal] = useState(false);
  const [emailForVerification, setEmailForVerification] = useState<string | null>(null);

  // Open auth modal function to be passed to context and Router
  const openAuthModal = (view: "login" | "register" | "reset-password" = "login") => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = (result?: { emailVerificationPending?: boolean; email?: string }) => {
    setIsAuthModalOpen(false); // Close the main AuthModal
    if (result?.emailVerificationPending && result.email) {
      setEmailForVerification(result.email);
      setShowCheckEmailModal(true); // Trigger the new "Check Email" modal
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider openAuthModal={openAuthModal}>
          <ChatProvider>
            <TooltipProvider>
              <ScrollRestoration />
              <Toaster />
              <Router openAuthModal={openAuthModal} />
              <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={closeAuthModal} 
                view={authModalView}
                setView={setAuthModalView}
              />
              <CheckEmailModal
                isOpen={showCheckEmailModal}
                onClose={() => setShowCheckEmailModal(false)}
                email={emailForVerification}
              />
            </TooltipProvider>
          </ChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
