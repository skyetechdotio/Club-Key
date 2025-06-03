import { Helmet } from "react-helmet";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin } from "lucide-react";

// Define the form schema with validation
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters long" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  subject: z.string().min(5, { message: "Subject must be at least 5 characters long" }),
  message: z.string().min(10, { message: "Message must be at least 10 characters long" }),
  inquiryType: z.string(),
});

type FormData = z.infer<typeof formSchema>;

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the form with default values
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
      inquiryType: "general",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      
      toast({
        title: "Message Sent",
        description: "Thank you for your message. We'll get back to you shortly.",
      });
      
      form.reset();
    }, 1000);
  };

  return (
    <>
      <Helmet>
        <title>Contact Us | Linx Golf</title>
        <meta name="description" content="Get in touch with the Linx Golf team. We're here to answer your questions about our golf tee time marketplace and help you get the most out of your experience." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-heading font-bold text-center mb-4">Contact Us</h1>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Have questions or feedback? We'd love to hear from you. Fill out the form below or reach out to us directly.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" /> Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  <a href="mailto:support@linxgolf.com" className="text-primary hover:underline">
                    support@linxgolf.com
                  </a>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  For general inquiries and support
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" /> Phone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  <a href="tel:+18889876543" className="text-primary hover:underline">
                    (888) 987-6543
                  </a>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Monday-Friday, 9am-5pm ET
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  123 Golf View Drive<br />
                  Suite 400<br />
                  Pebble Beach, CA 93953
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Send us a message</CardTitle>
              <CardDescription>
                We'll get back to you as soon as possible, typically within 24 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="john@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="inquiryType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inquiry Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an inquiry type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="general">General Inquiry</SelectItem>
                              <SelectItem value="support">Technical Support</SelectItem>
                              <SelectItem value="billing">Billing Question</SelectItem>
                              <SelectItem value="host">Becoming a Host</SelectItem>
                              <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                              <SelectItem value="feedback">Feedback</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="How do I become a host?" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Please provide details about your inquiry..." 
                            className="min-h-[120px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <div className="mt-12">
            <h2 className="text-2xl font-heading font-semibold text-center mb-4">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How do I become a host?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    To become a host, you need to be a member of a golf club. Simply sign up, complete your profile, and select the "Become a Host" option in your dashboard. Our team will verify your membership and approve your host status.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How does payment work?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We use Stripe for secure payment processing. When you book a tee time, funds are held in escrow until 24 hours after your golf experience to ensure both parties are satisfied. Hosts receive payouts directly to their bank accounts.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}