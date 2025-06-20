import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import magnoliaBackground from "@/assets/images/magnolia-background.jpg";

export default function BecomeHostSection() {
  const { user, isAuthenticated, openAuthModal } = useAuthStore();

  const handleBecomeHost = () => {
    if (!isAuthenticated) {
      openAuthModal("register");
    }
  };

  const benefits = [
    "Make the most of your club membership",
    "Meet fellow golf enthusiasts",
    "Set your own schedule and pricing",
    "Secure payments with Stripe Connect"
  ];

  return (
    <section className="py-12 relative">
      <div 
        className="absolute inset-0 bg-cover bg-center" 
        style={{ 
          backgroundImage: `url(${magnoliaBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-lg bg-white p-8 rounded-lg shadow-lg ml-auto">
          <h2 className="text-3xl font-heading font-bold text-neutral-dark mb-4">
            Host Your Club's Tee Times
          </h2>
          <p className="text-neutral-medium mb-6">
            Are you a golf club member? Share your club access with other golfers and earn income from your membership.
          </p>
          
          <div className="space-y-4 mb-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6">
                  <CheckCircle className="h-6 w-6 text-[#1B81EE]" />
                </div>
                <div className="ml-3">
                  <p className="text-neutral-dark">{benefit}</p>
                </div>
              </div>
            ))}
          </div>
          
          {isAuthenticated && user?.isHost ? (
            <Link href="/create-listing">
              <Button className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-lg transition-all mb-4">
                Create a Listing
              </Button>
            </Link>
          ) : (
            <>
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-lg transition-all mb-4">
                    Become a Host
                  </Button>
                </Link>
              ) : (
                <Button 
                  onClick={handleBecomeHost}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-lg transition-all mb-4"
                >
                  Become a Host
                </Button>
              )}
            </>
          )}
          
          {!isAuthenticated && (
            <div className="mt-4">
              <Button 
                onClick={() => openAuthModal("register")}
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/5 font-bold py-3 px-6 rounded-lg transition-all mb-3"
              >
                Sign Up
              </Button>
              <p className="text-sm text-neutral-medium text-center">
                Already have an account? <Button variant="link" className="p-0 h-auto" onClick={() => openAuthModal("login")}>Sign in</Button>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
