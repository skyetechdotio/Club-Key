import { Search, CalendarCheck, Flag } from "lucide-react";

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-12 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-heading font-bold text-neutral-dark mb-4">
            How Linx Works
          </h2>
          <p className="text-neutral-medium max-w-2xl mx-auto">
            Connecting golf enthusiasts with club members for exclusive access to the world's best golf courses.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <Search className="h-6 w-6 text-[#1B81EE]" />
            </div>
            <h3 className="font-heading font-bold text-xl mb-2">Find Your Course</h3>
            <p className="text-neutral-medium">
              Browse exclusive tee times at members-only golf clubs hosted by club members.
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CalendarCheck className="h-6 w-6 text-[#1B81EE]" />
            </div>
            <h3 className="font-heading font-bold text-xl mb-2">Book Your Tee Time</h3>
            <p className="text-neutral-medium">
              Secure your spot with our easy booking system and connect with your host to plan your visit.
            </p>
          </div>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <Flag className="h-6 w-6 text-[#1B81EE]" />
            </div>
            <h3 className="font-heading font-bold text-xl mb-2">Enjoy Your Golf Round</h3>
            <p className="text-neutral-medium">
              Enjoy access to exceptional courses typically reserved for members only, followed by sharing your experience.
            </p>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <a 
            href="/tee-times" 
            className="inline-flex items-center justify-center bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg transition-all"
          >
            Browse Available Tee Times
            <span className="ml-2" aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
