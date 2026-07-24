"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  ChevronRight,
  Check,
  Star,
  ShieldCheck,
  Clock,
  Zap,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { useAsync, apiClient } from "@/lib/api-client";
import { LeadForm } from "@/components/lead/lead-form";
import { ChatWidget } from "@/components/ai/chat-widget";

type PublicOrg = {
  name: string;
  slug: string;
  industry: string;
  services: string | null;
  primaryColor: string;
  whatsappNumber: string | null;
  whatsappConnected: boolean;
};

type PublicWebsite = {
  id: string;
  template: string;
  heroHeadline: string | null;
  heroSubtext: string | null;
  aboutText: string | null;
  services: { name: string; description: string }[];
  faq: { question: string; answer: string }[];
  ctaText: string | null;
};

const INDUSTRY_EMOJI: Record<string, string> = {
  legal: "⚖️",
  consulting: "💼",
  hr: "🤝",
  coaching: "🎯",
  wellness: "🌿",
  accounting: "📊",
  construction: "🏗️",
  insurance: "🛡️",
  other: "✨",
};

export default function PublicSiteView() {
  const publicSlug = useAppStore((s) => s.publicSlug);
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);

  const { data, loading, error } = useAsync(
    () => (publicSlug ? apiClient.getPublicWebsite(publicSlug) : Promise.reject(new Error("no-slug"))),
    [publicSlug]
  );

  const [contactRef, setContactRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!publicSlug) navigate("dashboard");
  }, [publicSlug, navigate]);

  if (!publicSlug) return null;

  if (loading) return <PublicSiteSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-6 text-center">
        <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <ShieldCheck className="size-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">This site is not published yet</h1>
        <p className="text-slate-400 mt-2 max-w-md">
          The business owner hasn&apos;t published their website yet. Please check back later or
          contact them directly.
        </p>
        {user && (
          <Button
            className="mt-6 border-white/20 text-white hover:bg-white/10 hover:text-white"
            variant="outline"
            onClick={() => navigate("dashboard")}
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Button>
        )}
      </div>
    );
  }

  const org = data.org as PublicOrg;
  const website = data.website as PublicWebsite;
  const brand = org.primaryColor || "#10b981";

  return (
    <div
      className="min-h-screen bg-[#0a0a0a]"
      style={{ ["--brand" as any]: brand }}
    >
      {/* Back to dashboard (only for logged-in owners) */}
      {user && (
        <button
          onClick={() => navigate("dashboard", { tab: "website" })}
          className="fixed top-3 left-3 z-40 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 shadow-sm transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to dashboard
        </button>
      )}

      <PublicSiteContent
        org={org}
        website={website}
        brand={brand}
        contactRef={contactRef}
        setContactRef={setContactRef}
      />

      <ChatWidget slug={org.slug} businessName={org.name} />
    </div>
  );
}

/* ---------------------------- content ---------------------------- */

function PublicSiteContent({
  org,
  website,
  brand,
  contactRef,
  setContactRef,
}: {
  org: PublicOrg;
  website: PublicWebsite;
  brand: string;
  contactRef: HTMLDivElement | null;
  setContactRef: (el: HTMLDivElement | null) => void;
}) {
  const industryEmoji = INDUSTRY_EMOJI[org.industry] ?? "✨";
  const headline = website.heroHeadline || `Welcome to ${org.name}`;
  const subtext =
    website.heroSubtext ||
    `Trusted ${org.industry.replace(/^\w/, (c) => c.toUpperCase())} services, built for South African businesses.`;
  const about = website.aboutText || `${org.name} is proud to serve our community with professional, reliable service. Our team is committed to delivering real results and building long-term relationships with every client.`;
  const cta = website.ctaText || "Get a Free Consultation";

  function scrollToContact() {
    contactRef?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="size-9 shrink-0 rounded-lg flex items-center justify-center text-lg shadow-sm"
              style={{ backgroundColor: `${brand}22`, border: `1px solid ${brand}40` }}
            >
              {industryEmoji}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate leading-tight">{org.name}</p>
              <p className="text-[11px] text-slate-400 capitalize leading-tight">
                {org.industry} • South Africa
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button onClick={scrollToContact} className="hover:text-white transition-colors">
              Services
            </button>
            <button onClick={scrollToContact} className="hover:text-white transition-colors">
              About
            </button>
            <button onClick={scrollToContact} className="hover:text-white transition-colors">
              FAQ
            </button>
            <button onClick={scrollToContact} className="hover:text-white transition-colors">
              Contact
            </button>
          </nav>

          <button
            onClick={scrollToContact}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: brand }}
          >
            {cta}
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background: `radial-gradient(60% 80% at 80% 20%, ${brand}22 0%, transparent 60%), radial-gradient(50% 60% at 10% 90%, ${brand}15 0%, transparent 55%)`,
          }}
        />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-5"
              style={{ backgroundColor: `${brand}1f`, color: brand }}
            >
              <Sparkles className="size-3.5" />
              {org.industry.replace(/^\w/, (c) => c.toUpperCase())} experts, ready to help
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.05]">
              {headline}
            </h1>
            <p className="mt-5 text-lg text-slate-300 max-w-xl leading-relaxed">{subtext}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={scrollToContact}
                className="inline-flex items-center gap-2 text-base font-semibold text-white px-6 py-3.5 rounded-xl shadow-md hover:opacity-90 transition-opacity"
                style={{ backgroundColor: brand }}
              >
                {cta}
                <ChevronRight className="size-4" />
              </button>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <div className="flex -space-x-1">
                  {["JM", "TK", "SL", "★"].map((label, i) => (
                    <span
                      key={i}
                      className="size-7 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: brand, opacity: 1 - i * 0.15 }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-0.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400">Trusted by SA businesses</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Decorative card cluster */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative hidden lg:block"
          >
            <div
              className="absolute -inset-4 rounded-3xl -z-10"
              style={{ background: `linear-gradient(135deg, ${brand}25, transparent 70%)` }}
            />
            <div className="bg-white/[0.03] rounded-3xl border border-white/10 shadow-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="size-2 rounded-full animate-pulse"
                  style={{ backgroundColor: brand }}
                />
                <span className="text-xs font-medium text-slate-400">Live enquiry feed</span>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Thandiwe N.", service: "Booked a consultation", time: "2m ago" },
                  { name: "Sipho M.", service: "Requested a quote", time: "8m ago" },
                  { name: "Lerato K.", service: "Asked about services", time: "15m ago" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.15 }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.05]"
                  >
                    <span
                      className="size-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                      style={{ backgroundColor: brand }}
                    >
                      {item.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.name}</p>
                      <p className="text-xs text-slate-400 truncate">{item.service}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">{item.time}</span>
                  </motion.div>
                ))}
              </div>
              <div
                className="mt-4 flex items-center gap-2 p-3 rounded-xl text-xs font-medium"
                style={{ backgroundColor: `${brand}1a`, color: brand }}
              >
                <Zap className="size-3.5" />
                AI-powered responses • Avg. reply &lt; 2 hours
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Clock, label: "Fast response", value: "< 2 hrs" },
            { icon: ShieldCheck, label: "POPIA compliant", value: "100%" },
            { icon: Star, label: "Avg. rating", value: "4.9 / 5" },
            { icon: Sparkles, label: "AI-powered", value: "Always on" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              <span
                className="size-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${brand}1f`, color: brand }}
              >
                <s.icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">{s.value}</p>
                <p className="text-[11px] text-slate-400 leading-tight">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-3"
            style={{ backgroundColor: `${brand}1f`, color: brand }}
          >
            <Sparkles className="size-3.5" />
            What we offer
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Our services
          </h2>
          <p className="mt-3 text-slate-400">
            Professional solutions tailored to your needs.
          </p>
        </div>

        {website.services.length === 0 ? (
          <p className="text-center text-slate-400 text-sm">
            Service details coming soon. Get in touch to learn more.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {website.services.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group bg-white/[0.03] rounded-2xl border border-white/10 p-6 hover:border-white/20 hover:bg-white/[0.05] transition-all"
              >
                <div
                  className="size-11 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${brand}1f`, color: brand }}
                >
                  <Sparkles className="size-5" />
                </div>
                <h3 className="font-semibold text-white text-lg">{s.name}</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{s.description}</p>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* About */}
      <section id="about" className="bg-white/[0.02] border-y border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-3"
              style={{ backgroundColor: `${brand}1f`, color: brand }}
            >
              About us
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Why choose {org.name}?
            </h2>
            <p className="mt-5 text-slate-300 leading-relaxed whitespace-pre-wrap">{about}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
              {[
                "Local SA expertise",
                "Fast turnaround",
                "Transparent pricing",
                "Dedicated support",
              ].map((p) => (
                <div key={p} className="flex items-center gap-2 text-sm text-slate-300">
                  <span
                    className="size-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${brand}26`, color: brand }}
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {p}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              className="aspect-[4/3] rounded-3xl shadow-xl flex items-center justify-center overflow-hidden relative"
              style={{
                background: `linear-gradient(135deg, ${brand}, ${brand}cc)`,
              }}
            >
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 40%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.3) 0%, transparent 40%)"
              }} />
              <div className="relative text-center text-white p-8">
                <span className="text-7xl mb-3 block">{industryEmoji}</span>
                <p className="text-2xl font-bold">{org.name}</p>
                <p className="text-white/80 text-sm mt-1">Serving South Africa with pride 🇿🇦</p>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-[#0a0a0a] rounded-2xl shadow-lg border border-white/10 px-4 py-3 flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-7 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ backgroundColor: brand }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">4.9 / 5 rating</p>
                <p className="text-[10px] text-slate-400">from 120+ happy clients</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {website.faq.length > 0 && (
        <section id="faq" className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-10">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-3"
              style={{ backgroundColor: `${brand}1f`, color: brand }}
            >
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Frequently asked questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {website.faq.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border-white/10"
              >
                <AccordionTrigger className="text-left text-base font-medium text-white hover:no-underline hover:bg-white/5">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-300 leading-relaxed">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {/* Contact / Lead form */}
      <section
        id="contact"
        ref={setContactRef}
        className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20 scroll-mt-16"
      >
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-3"
              style={{ backgroundColor: `${brand}1f`, color: brand }}
            >
              <MessageCircle className="size-3.5" />
              Get in touch
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Let&apos;s get you sorted.
            </h2>
            <p className="mt-3 text-slate-300 leading-relaxed">
              Fill in the form and our team will WhatsApp or call you back within 2 hours during
              business hours. No spam, ever.
            </p>

            <div className="mt-8 space-y-4">
              {org.whatsappNumber && (
                <ContactRow
                  icon={MessageCircle}
                  label="WhatsApp"
                  value={org.whatsappNumber}
                  brand={brand}
                />
              )}
              <ContactRow
                icon={Phone}
                label="Phone"
                value={org.whatsappNumber || "Available on request"}
                brand={brand}
              />
              <ContactRow
                icon={Mail}
                label="Email"
                value="We'll respond by WhatsApp first"
                brand={brand}
              />
              <ContactRow
                icon={MapPin}
                label="Location"
                value="South Africa 🇿🇦"
                brand={brand}
              />
            </div>

            <div
              className="mt-8 p-4 rounded-xl flex items-start gap-3 border border-white/10"
              style={{ backgroundColor: `${brand}12` }}
            >
              <ShieldCheck className="size-5 shrink-0 mt-0.5" style={{ color: brand }} />
              <p className="text-xs text-slate-400 leading-relaxed">
                Your information is protected under POPIA. We only use it to respond to your enquiry
                and will never share it with third parties.
              </p>
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-2xl border border-white/10 shadow-lg p-6 sm:p-8">
            <h3 className="text-xl font-bold text-white mb-1">{cta}</h3>
            <p className="text-sm text-slate-400 mb-6">
              Takes 30 seconds. We&apos;ll be in touch shortly.
            </p>
            <LeadForm slug={org.slug} businessName={org.name} ctaText={cta} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0a0a0a] text-slate-400">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid sm:grid-cols-2 gap-6 items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className="size-9 rounded-lg flex items-center justify-center text-lg"
                style={{ backgroundColor: `${brand}26` }}
              >
                {industryEmoji}
              </span>
              <div>
                <p className="font-semibold text-white">{org.name}</p>
                <p className="text-[11px] text-slate-400 capitalize">{org.industry}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 max-w-sm">
              Proudly serving South African businesses with professional, reliable service.
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} {org.name}. All rights reserved.
            </p>
            <a
              href="#"
              className="text-xs text-slate-400 hover:text-white underline underline-offset-2 mt-1 inline-block"
            >
              Privacy Policy (POPIA)
            </a>
            <p className="mt-4 text-[11px] text-slate-500 inline-flex items-center gap-1.5">
              Powered by{" "}
              <span className="font-semibold text-slate-500">Lead Machine</span> 🇿🇦
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  brand,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  brand: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${brand}1f`, color: brand }}
      >
        <Icon className="size-4.5" />
      </span>
      <div>
        <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}

/* ---------------------------- skeleton ---------------------------- */

function PublicSiteSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Skeleton className="h-9 w-48 bg-white/5" />
          <Skeleton className="h-8 w-28 bg-white/5" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 grid lg:grid-cols-2 gap-10">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40 bg-white/5" />
          <Skeleton className="h-16 w-full bg-white/5" />
          <Skeleton className="h-16 w-3/4 bg-white/5" />
          <Skeleton className="h-12 w-48 bg-white/5" />
        </div>
        <Skeleton className="aspect-[4/3] w-full rounded-3xl bg-white/5" />
      </div>
    </div>
  );
}

export { PublicSiteView };
