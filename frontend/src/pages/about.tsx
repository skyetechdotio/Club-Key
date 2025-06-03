import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, Users, Shield, Calendar } from "lucide-react";
import golfBallLogo from "@/assets/new-logo.svg";

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About Us | Linx Golf</title>
        <meta name="description" content="Learn about Linx Golf, our mission to connect golf enthusiasts with exclusive club tee times, and how we're revolutionizing the golfing experience." />
      </Helmet>
      
      {/* Hero Section */}
      <section className="relative bg-background pt-16 pb-20 md:pt-24 md:pb-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-6">Transforming Access to Golf's Most Exclusive Experiences</h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              We're building a world where passionate golfers can access the finest courses, while club members can share their privileges and offset costs.
            </p>
            <Link href="/tee-times">
              <Button size="lg" className="group">
                Find Tee Times <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Removed gradient */}
      </section>
      
      {/* Stats Section */}
      <section className="py-12 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-primary mb-2">500+</p>
              <p className="text-lg text-muted-foreground">Private Clubs</p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-primary mb-2">10K+</p>
              <p className="text-lg text-muted-foreground">Golfers Served</p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-5xl font-bold text-primary mb-2">35+</p>
              <p className="text-lg text-muted-foreground">U.S. States</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Our Story Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">Our Story</h2>
            <div className="flex justify-center mb-6">
              <img src={golfBallLogo} alt="Linx Golf Logo" className="h-16 w-16" />
            </div>
            <p className="text-lg text-muted-foreground">
              Linx was founded in 2023 by a team of golf enthusiasts and tech innovators who recognized a fundamental problem in the golfing world: while many private clubs have unused tee times, countless golfers are eager for opportunities to play at these exclusive venues.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-5xl mx-auto">
            <div>
              <h3 className="text-2xl font-heading font-semibold mb-4">The Problem We're Solving</h3>
              <p className="text-muted-foreground mb-4">
                Private golf clubs often have unused tee times that go to waste. Meanwhile, passionate golfers who aren't club members rarely get the chance to experience these exceptional courses.
              </p>
              <p className="text-muted-foreground">
                Additionally, club members pay substantial dues for access they may not fully utilize, creating a financial burden for many golf enthusiasts.
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-heading font-semibold mb-4">Our Solution</h3>
              <p className="text-muted-foreground mb-4">
                We created Linx to bridge this gap, providing a secure platform where club members can host golfers at their clubs, and golf enthusiasts can discover and book unique playing opportunities that would otherwise be inaccessible.
              </p>
              <p className="text-muted-foreground">
                Our platform helps members offset their club dues while giving passionate golfers access to experiences typically reserved for the privileged few.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">How Linx Works</h2>
            <p className="text-lg text-muted-foreground">
              Our platform connects two distinct groups to create a seamless golfing marketplace.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="bg-background rounded-xl p-8 shadow-sm">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-6">
                <Calendar className="h-6 w-6 text-[#1B81EE]" />
              </div>
              <h3 className="text-2xl font-heading font-semibold mb-4">For Hosts</h3>
              <p className="text-muted-foreground mb-6">
                Golf club members who have access to tee times at private or semi-private clubs and wish to share these experiences while recouping their membership costs.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-[#1B81EE] mr-2">•</span>
                  <span>List available tee times at your club</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1B81EE] mr-2">•</span>
                  <span>Set your own prices and availability</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1B81EE] mr-2">•</span>
                  <span>Meet interesting golfers and grow your network</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1B81EE] mr-2">•</span>
                  <span>Offset your club membership dues</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-background rounded-xl p-8 shadow-sm">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-[#1B81EE]" />
              </div>
              <h3 className="text-2xl font-heading font-semibold mb-4">For Guests</h3>
              <p className="text-muted-foreground mb-6">
                Passionate golfers seeking unique playing experiences at exclusive venues that would typically be unavailable to them.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-[#1B81EE] mr-2">•</span>
                  <span>Access private and semi-private clubs</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1B81EE] mr-2">•</span>
                  <span>Book tee times directly through the platform</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1B81EE] mr-2">•</span>
                  <span>Enjoy secure payments and verified hosts</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#1B81EE] mr-2">•</span>
                  <span>Experience courses typically closed to the public</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* Our Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">Our Values</h2>
            <p className="text-lg text-muted-foreground">
              These principles guide everything we do at Linx Golf.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="h-8 w-8 text-[#1B81EE]" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-3">Accessibility</h3>
              <p className="text-muted-foreground">
                We believe great golf should be more accessible, without compromising the exclusivity that makes private clubs special.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-[#1B81EE]" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-3">Community</h3>
              <p className="text-muted-foreground">
                We're building a community of passionate golfers who share experiences, forge connections, and enhance the sport we love.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-[#1B81EE]" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-3">Integrity</h3>
              <p className="text-muted-foreground">
                We uphold the traditions and etiquette of golf while innovating the way people access and enjoy the game.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">Join the Linx Community</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Whether you're a club member looking to host fellow golf enthusiasts or a golfer seeking new and exclusive playing opportunities, we invite you to join the Linx community and transform the way you experience golf.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/tee-times">
                <Button size="lg" variant="default">Find Tee Times</Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline">List Your Club</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}