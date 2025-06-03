import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Testimonial {
  id: number;
  content: string;
  rating: number;
  author: {
    name: string;
    location: string;
    avatar: string;
    initials: string;
  };
}

export default function TestimonialsSection() {
  const testimonials: Testimonial[] = [
    {
      id: 1,
      content: "Absolutely incredible experience! I never thought I'd get to play at Augusta National, but thanks to Linx and my amazing host James, I got to tick it off my bucket list. The process was seamless and James was a fantastic guide.",
      rating: 5,
      author: {
        name: "Robert Johnson",
        location: "Augusta, GA",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        initials: "RJ"
      }
    },
    {
      id: 2,
      content: "As a traveling golfer, finding high-quality courses to play can be challenging. Linx changed that for me. My experience at Pebble Beach with host Sarah was top-notch. She was knowledgeable, friendly, and made the round even more special.",
      rating: 5,
      author: {
        name: "Lisa Peterson",
        location: "San Francisco, CA",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        initials: "LP"
      }
    },
    {
      id: 3,
      content: "I've been hosting on Linx for six months now, and it's been wonderful sharing my club with passionate golfers. The platform is easy to use, payments are secure, and I've met some great people. It's also nice to offset some of my membership costs!",
      rating: 4.5,
      author: {
        name: "Michael Thomas",
        location: "Pine Valley, NJ",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        initials: "MT"
      }
    }
  ];

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="text-yellow-400 flex">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="fill-yellow-400" />
        ))}
        {hasHalfStar && (
          <Star className="fill-yellow-400" style={{ clipPath: 'inset(0 50% 0 0)' }} />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} />
        ))}
      </div>
    );
  };

  return (
    <section className="py-12 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-heading font-bold text-neutral-dark mb-4">
            What Golfers Are Saying
          </h2>
          <p className="text-neutral-medium max-w-2xl mx-auto">
            Hear from golf enthusiasts who've experienced playing at exclusive courses through Linx.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                {renderStars(testimonial.rating)}
              </div>
              <p className="text-neutral-medium mb-4">{testimonial.content}</p>
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={testimonial.author.avatar} alt={testimonial.author.name} />
                  <AvatarFallback>{testimonial.author.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{testimonial.author.name}</p>
                  <p className="text-sm text-neutral-medium">{testimonial.author.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
