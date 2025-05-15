import HeroSection from "@/components/home/hero-section";
import FeaturedTeeTimesSection from "@/components/home/featured-tee-times";
import HowItWorksSection from "@/components/home/how-it-works";
import BecomeHostSection from "@/components/home/become-host";
import TopDestinationsSection from "@/components/home/top-destinations";
import TestimonialsSection from "@/components/home/testimonials";
import CtaSection from "@/components/home/cta-section";
import Footer from "@/components/footer";
import { Helmet } from 'react-helmet';

export default function Home() {
  return (
    <>
      <Helmet>
        <title>Linx - Book Exclusive Golf Tee Times with Club Members</title>
        <meta name="description" content="Connect with golf club members to book tee times at exclusive courses. Find and play at prestigious golf clubs typically reserved for members only." />
      </Helmet>
      <div>
        <HeroSection />
        <FeaturedTeeTimesSection />
        <HowItWorksSection />
        <BecomeHostSection />
        <TopDestinationsSection />
        <TestimonialsSection />
        <CtaSection />
        <Footer />
      </div>
    </>
  );
}
