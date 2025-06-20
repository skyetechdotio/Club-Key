import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";

export default function CtaSection() {
  const { isAuthenticated, openAuthModal } = useAuthStore();

  const handleFindTeeTimesClick = () => {
    if (!isAuthenticated) {
      openAuthModal("login");
    }
  };

  const handleBecomeHostClick = () => {
    if (!isAuthenticated) {
      openAuthModal("register");
    }
  };
  
  const handleSignUpClick = () => {
    openAuthModal("register");
  };

  return (
    <section className="py-12 bg-primary">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-heading font-bold text-white mb-4">
          Ready to Play at Exclusive Golf Clubs?
        </h2>
        <p className="text-white opacity-90 max-w-2xl mx-auto mb-8">
          Join thousands of golfers who are experiencing world-class courses through Linx.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {isAuthenticated ? (
            <Link href="/tee-times">
              <Button className="bg-white text-primary hover:bg-gray-100 font-bold py-3 px-8 rounded-lg transition-all w-full sm:w-auto">
                Find Tee Times
              </Button>
            </Link>
          ) : (
            <Button 
              onClick={handleSignUpClick}
              className="bg-white text-primary hover:bg-gray-100 font-bold py-3 px-8 rounded-lg transition-all w-full sm:w-auto"
            >
              Sign Up
            </Button>
          )}
          
          {isAuthenticated && (
            <Link href="/dashboard">
              <Button
                variant="outline" 
                className="bg-transparent text-white border border-white hover:bg-white/10 font-bold py-3 px-8 rounded-lg transition-all w-full sm:w-auto"
              >
                Become a Host
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
