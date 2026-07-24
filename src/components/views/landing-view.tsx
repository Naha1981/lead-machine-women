"use client";

import LandingHeader from "@/components/marketing/landing-header";
import LandingFooter from "@/components/marketing/landing-footer";
import HeroSection from "@/components/marketing/hero-section";
import HowItWorksSection from "@/components/marketing/how-it-works-section";
import FeaturesSection from "@/components/marketing/features-section";
import PricingSection from "@/components/marketing/pricing-section";
import TestimonialsSection from "@/components/marketing/testimonials-section";
import FaqSection from "@/components/marketing/faq-section";
import CtaSection from "@/components/marketing/cta-section";

export default function LandingView() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
