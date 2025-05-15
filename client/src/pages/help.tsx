import { Helmet } from "react-helmet";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, User, Calendar, CreditCard, Users, MessageSquare, Shield, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "wouter";

// Help center categories and FAQs data
const helpCategories = [
  {
    id: "getting-started",
    icon: <User className="h-5 w-5" />,
    name: "Getting Started",
    description: "Account setup and basics",
    faqs: [
      {
        id: "account-setup",
        question: "How do I create an account?",
        answer: "Creating an account is easy! Click on the 'Sign Up' button in the top right corner of the homepage. You can sign up using your email address or continue with Google. Follow the prompts to complete your profile with your name, profile picture, and golf experience."
      },
      {
        id: "profile-completion",
        question: "What information do I need to provide for my profile?",
        answer: "To complete your profile, you'll need to add your full name, email, a profile picture, and some information about your golf experience. Hosts will also need to verify their club membership and provide banking details for payouts."
      },
      {
        id: "host-vs-guest",
        question: "What's the difference between a host and a guest?",
        answer: "Hosts are golf club members who can list available tee times at their clubs. Guests are golfers looking to book those tee times. You can sign up as a guest first and upgrade to a host later if you have club memberships."
      }
    ]
  },
  {
    id: "booking",
    icon: <Calendar className="h-5 w-5" />,
    name: "Booking Tee Times",
    description: "Finding and booking tee times",
    faqs: [
      {
        id: "find-tee-times",
        question: "How do I find available tee times?",
        answer: "Use the search feature on the homepage to filter tee times by location, date, price range, and more. You can browse listings and view details about each club and host before making a booking."
      },
      {
        id: "booking-process",
        question: "What is the booking process?",
        answer: "Once you find a tee time you like, click 'Book Now' and select how many players will be joining. Review the details, then proceed to checkout. Your payment will be held in escrow until 24 hours after your game to ensure everything goes smoothly."
      },
      {
        id: "cancellation",
        question: "What is the cancellation policy?",
        answer: "Cancellation policies vary by host, but generally, you can receive a full refund if you cancel at least 48 hours before the scheduled tee time. Check the specific listing for the exact policy."
      }
    ]
  },
  {
    id: "hosting",
    icon: <Users className="h-5 w-5" />,
    name: "Hosting",
    description: "Creating and managing listings",
    faqs: [
      {
        id: "become-host",
        question: "How do I become a host?",
        answer: "To become a host, go to your profile and click 'Become a Host.' You'll need to verify your club membership and set up your payment details. Our team will review your application and approve you, typically within 24-48 hours."
      },
      {
        id: "list-tee-time",
        question: "How do I list a tee time?",
        answer: "Once approved as a host, click 'Create Listing' in your dashboard. Select your club, date and time, set a price, and add details about the experience. Include any special notes or requirements for guests."
      },
      {
        id: "host-responsibilities",
        question: "What are my responsibilities as a host?",
        answer: "As a host, you should provide accurate information about the tee time, respond promptly to guest inquiries, meet your guests on the day of play, and ensure they have a positive experience at your club."
      }
    ]
  },
  {
    id: "payments",
    icon: <CreditCard className="h-5 w-5" />,
    name: "Payments & Pricing",
    description: "Payment processing and fees",
    faqs: [
      {
        id: "payment-methods",
        question: "What payment methods are accepted?",
        answer: "We accept all major credit and debit cards through our secure payment processor, Stripe. We do not accept cash payments or direct bank transfers between users for safety reasons."
      },
      {
        id: "host-payouts",
        question: "How and when do hosts receive payment?",
        answer: "Host payments are held in escrow until 24 hours after the scheduled tee time. After this period, the funds are released to the host's connected bank account, typically arriving within 1-3 business days."
      },
      {
        id: "service-fees",
        question: "What fees does Linx charge?",
        answer: "Linx charges a 10% service fee to hosts and a 5% booking fee to guests. These fees help us maintain the platform, provide customer support, and cover payment processing costs."
      }
    ]
  },
  {
    id: "communication",
    icon: <MessageSquare className="h-5 w-5" />,
    name: "Messaging & Communication",
    description: "Connecting with hosts and guests",
    faqs: [
      {
        id: "contact-host",
        question: "How do I contact a host before booking?",
        answer: "You can message a host directly from their listing page by clicking the 'Contact Host' button. Ask any questions you have about the club, tee time, or specific requirements."
      },
      {
        id: "messaging-system",
        question: "How does the messaging system work?",
        answer: "Our in-app messaging system allows secure communication between hosts and guests. You'll receive notifications for new messages, and you can access all your conversations from the 'Messages' tab in your dashboard."
      },
      {
        id: "after-booking-communication",
        question: "How should I communicate after making a booking?",
        answer: "After booking, you'll have a dedicated message thread with your host or guest. Use this to coordinate meeting details, ask questions, or address any changes to your plans."
      }
    ]
  },
  {
    id: "trust-safety",
    icon: <Shield className="h-5 w-5" />,
    name: "Trust & Safety",
    description: "Security and platform policies",
    faqs: [
      {
        id: "verify-identity",
        question: "How does Linx verify user identities?",
        answer: "We use a combination of email verification, phone number verification, and ID checks for hosts. We also use review systems to help maintain trust within our community."
      },
      {
        id: "dispute-resolution",
        question: "What if something goes wrong with my booking?",
        answer: "If you encounter any issues, first try to resolve them directly with the other party through our messaging system. If that doesn't work, contact our support team, who can help mediate and resolve disputes."
      },
      {
        id: "safety-tips",
        question: "What safety tips should I follow when using Linx?",
        answer: "Always communicate through our platform, never share personal contact information until necessary, read reviews carefully, and report any suspicious behavior to our Trust & Safety team."
      }
    ]
  },
  {
    id: "technical-support",
    icon: <Clock className="h-5 w-5" />,
    name: "Technical Support",
    description: "App and website troubleshooting",
    faqs: [
      {
        id: "account-access",
        question: "I can't log into my account. What should I do?",
        answer: "First, try resetting your password using the 'Forgot Password' link on the login page. If that doesn't work, check that you're using the correct email address. If you still have issues, contact our support team for assistance."
      },
      {
        id: "app-issues",
        question: "The app is not working properly. How can I fix it?",
        answer: "Try closing and reopening the app, check for updates, or reinstall it. If problems persist, please contact our technical support team with details about your device and the issues you're experiencing."
      },
      {
        id: "notification-preferences",
        question: "How do I manage my notification preferences?",
        answer: "You can customize your notification settings in your account profile. Go to 'Account Settings' > 'Notifications' to choose which alerts you want to receive and how you want to receive them (email, push notifications, or both)."
      }
    ]
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("getting-started");
  
  // Filter FAQs based on search query
  const filteredFAQs = searchQuery 
    ? helpCategories.flatMap(category => 
        category.faqs.filter(faq => 
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(faq => ({ ...faq, category: category.id }))
      )
    : [];
  
  return (
    <>
      <Helmet>
        <title>Help Center | Linx Golf</title>
        <meta name="description" content="Find answers to frequently asked questions about using the Linx Golf platform, booking tee times, hosting, payments, and more." />
      </Helmet>
      
      <div className="bg-primary/5 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-heading font-bold mb-4">How can we help you?</h1>
            <p className="text-muted-foreground mb-8">
              Search our knowledge base or browse categories below to find answers
            </p>
            
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input 
                placeholder="Search for help articles..." 
                className="pl-10 h-12"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button 
                variant="ghost" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-10 px-3 text-muted-foreground"
                onClick={() => setSearchQuery("")}
                hidden={!searchQuery}
              >
                Clear
              </Button>
            </div>
            
            {searchQuery && (
              <div className="mt-6 text-left">
                <h2 className="text-lg font-semibold mb-4">{filteredFAQs.length} results found for "{searchQuery}"</h2>
                {filteredFAQs.length > 0 ? (
                  <div className="space-y-4">
                    {filteredFAQs.map(faq => (
                      <div key={faq.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                        <p className="text-muted-foreground text-sm mb-3">{faq.answer.substring(0, 150)}...</p>
                        <button 
                          className="text-primary font-medium text-sm hover:underline"
                          onClick={() => {
                            setSearchQuery("");
                            setActiveCategory(faq.category as string);
                          }}
                        >
                          Read full answer →
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No results found. Try a different search term or browse the categories below.</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setSearchQuery("")}
                    >
                      Browse All Topics
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {!searchQuery && (
        <div className="container mx-auto px-4 py-12">
          <div className="mb-12">
            <h2 className="text-2xl font-heading font-semibold text-center mb-8">Popular Help Categories</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {helpCategories.slice(0, 4).map((category) => (
                <div 
                  key={category.id}
                  className="border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setActiveCategory(category.id)}
                >
                  <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center text-primary mb-4">
                    {category.icon}
                  </div>
                  <h3 className="font-heading font-semibold text-lg mb-2">{category.name}</h3>
                  <p className="text-muted-foreground text-sm">{category.description}</p>
                </div>
              ))}
            </div>
          </div>
          
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="max-w-4xl mx-auto">
            <TabsList className="flex flex-wrap h-auto mb-8">
              {helpCategories.map((category) => (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <div className="flex items-center gap-2">
                    {category.icon}
                    <span>{category.name}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {helpCategories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="border rounded-lg p-6">
                <h2 className="text-2xl font-heading font-semibold mb-6">{category.name}</h2>
                <p className="text-muted-foreground mb-6">{category.description}</p>
                
                <Accordion type="single" collapsible className="w-full">
                  {category.faqs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left font-medium">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            ))}
          </Tabs>
          
          <div className="mt-16 max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-heading font-semibold mb-4">Still need help?</h2>
            <p className="text-muted-foreground mb-8">
              Can't find the answer you're looking for? Please contact our support team.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/contact">
                <Button>Contact Support</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}