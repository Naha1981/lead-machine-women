"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  MessageCircle,
  Palette,
  RefreshCw,
  Rocket,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { apiClient } from "@/lib/api-client";
import {
  INDUSTRIES,
  INDUSTRY_PRESETS,
  PRIMARY_COLOR_DEFAULT,
  TEMPLATES,
} from "@/lib/constants";
import type { Org, Website } from "@/types";

const COLOR_PALETTE = [
  { name: "Emerald", value: "#059669" },
  { name: "Teal", value: "#0d9488" },
  { name: "Orange", value: "#ea580c" },
  { name: "Rose", value: "#e11d48" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Amber", value: "#d97706" },
];

const STEPS = [
  { id: 1, label: "Business" },
  { id: 2, label: "Style" },
  { id: 3, label: "AI Build" },
  { id: 4, label: "Live" },
];

const LOADING_MESSAGES = [
  "Crafting your headline...",
  "Writing your services...",
  "Preparing FAQs...",
  "Polishing your brand voice...",
  "Adding the final touches...",
];

const CONFETTI = ["🎉", "✨", "🚀", "💚", "⭐", "🎊"];

export default function OnboardingView() {
  const user = useAppStore((s) => s.user);
  const org = useAppStore((s) => s.org);
  const navigate = useAppStore((s) => s.navigate);
  const openPublicSite = useAppStore((s) => s.openPublicSite);
  const setSession = useAppStore((s) => s.setSession);

  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [services, setServices] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [template, setTemplate] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState<string>(PRIMARY_COLOR_DEFAULT);

  const [generatedWebsite, setGeneratedWebsite] = useState<Website | null>(null);
  const [generating, setGenerating] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<Org | null>(null);

  const generateFiredRef = useRef(false);
  const createOrgFiredRef = useRef(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);

  // "I already have a website?" toggle — branches the flow
  const [mode, setMode] = useState<"choose" | "generate" | "embed">("choose");
  const [existingSiteUrl, setExistingSiteUrl] = useState("");
  const [embedStep, setEmbedStep] = useState<1 | 2>(1);
  const [embedCreating, setEmbedCreating] = useState(false);
  const [embedCreated, setEmbedCreated] = useState(false);
  const embedCreateFiredRef = useRef(false);

  // Edge case: user already has an org -> bounce to dashboard
  useEffect(() => {
    if (org) {
      navigate("dashboard");
    }
  }, [org, navigate]);

  // Auto-select template + color when industry changes
  useEffect(() => {
    if (!industry) return;
    const ind = INDUSTRIES.find((i) => i.value === industry);
    if (ind) setTemplate(ind.template);
    const preset = INDUSTRY_PRESETS[industry];
    if (preset) setPrimaryColor(preset.color);
  }, [industry]);

  // Create org when entering step 3 (only once per visit) — must happen BEFORE
  // the AI website generation since generate-website requires an existing org.
  useEffect(() => {
    if (step !== 3) return;
    if (createOrgFiredRef.current || createdOrg) return;
    createOrgFiredRef.current = true;
    void runCreateOrg();
  }, [step]);

  // Auto-generate website when entering step 3 AND org has been created.
  useEffect(() => {
    if (step !== 3) return;
    if (generateFiredRef.current || generatedWebsite) return;
    if (!createdOrg) return; // wait for org to exist
    generateFiredRef.current = true;
    void runGenerate();
  }, [step, createdOrg]);

  // Rotate loading messages while generating
  useEffect(() => {
    if (!generating) return;
    let i = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]);
    }, 2200);
    return () => clearInterval(interval);
  }, [generating]);

  // (Org is now created in Step 3, before AI generation, so Step 4 just shows success.)

  async function runGenerate() {
    setGenerating(true);
    try {
      const { website } = await apiClient.generateWebsite({
        businessName: businessName.trim(),
        industry,
        services: services.trim(),
        template,
      });
      setGeneratedWebsite(website);
      // Auto-publish so the "Preview my Website" button in Step 4 works immediately.
      try {
        await apiClient.publishWebsite(true);
      } catch {
        /* non-fatal */
      }
      toast.success("Your website copy is ready!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate website";
      toast.error(msg);
      generateFiredRef.current = false; // allow retry via Regenerate
    } finally {
      setGenerating(false);
    }
  }

  // Create the org + refresh session so the AI generate-website call (which
  // requires an existing org) succeeds in Step 3.
  async function runCreateOrg() {
    if (createdOrg) return;
    setCreatingOrg(true);
    try {
      const { org: newOrg } = await apiClient.createOrg({
        name: businessName.trim(),
        industry,
        services: services.trim(),
        whatsappNumber: whatsappNumber.trim() || undefined,
        ownerPhone: whatsappNumber.trim() || undefined,
        primaryColor,
      });
      setCreatedOrg(newOrg);
      // NOTE: We intentionally do NOT call setSession() here — doing so would
      // trigger the store's auto-navigate from "onboarding" → "dashboard" and
      // unmount this wizard. The generate-website API authenticates via the
      // cookie session (not the store), so the org existing in the DB is
      // enough. The store gets refreshed when the user clicks "Go to Dashboard"
      // in Step 4 (via handleAction → apiClient.me() → setSession).
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create your business";
      toast.error(msg);
      createOrgFiredRef.current = false;
    } finally {
      setCreatingOrg(false);
    }
  }

  // Embed mode: create the org WITHOUT generating a website. The user keeps
  // their existing site and will paste a lead-capture snippet onto it.
  async function runCreateOrgEmbed() {
    if (embedCreated) return;
    setEmbedCreating(true);
    try {
      await apiClient.createOrg({
        name: businessName.trim(),
        industry,
        services: services.trim() || `(Existing site: ${existingSiteUrl.trim()})`,
        whatsappNumber: whatsappNumber.trim() || undefined,
        ownerPhone: whatsappNumber.trim() || undefined,
        primaryColor,
      });
      setEmbedCreated(true);
      toast.success("Your Lead Machine engine is ready! 🎉");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create your business";
      toast.error(msg);
      embedCreateFiredRef.current = false;
    } finally {
      setEmbedCreating(false);
    }
  }

  // Fire embed org-creation when entering embed step 2
  useEffect(() => {
    if (mode !== "embed") return;
    if (embedStep !== 2) return;
    if (embedCreateFiredRef.current || embedCreated) return;
    embedCreateFiredRef.current = true;
    void runCreateOrgEmbed();
  }, [mode, embedStep, embedCreated]);

  const step1Valid = Boolean(businessName.trim() && industry && services.trim());
  const step2Valid = Boolean(template && primaryColor);
  const step3Valid = Boolean(generatedWebsite);

  // Embed-mode step 1 validation: business name + industry + existing URL
  const embedStep1Valid = Boolean(
    businessName.trim() && industry && existingSiteUrl.trim()
  );

  function handleNext() {
    if (step === 1 && !step1Valid) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (step === 2 && !step2Valid) {
      toast.error("Please pick a template style");
      return;
    }
    if (step === 3 && !step3Valid) {
      toast.error("Please wait for the AI to finish writing your site");
      return;
    }
    if (step < 4) setStep(step + 1);
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  async function handleAction(action: "dashboard" | "preview" | "whatsapp") {
    try {
      // Refresh session — setSession will auto-route to dashboard (view is currently "onboarding").
      // We then override with the specific destination below.
      const { user: freshUser, org: freshOrg } = await apiClient.me();
      setSession(freshUser, freshOrg);

      if (action === "dashboard") {
        navigate("dashboard");
      } else if (action === "preview") {
        const slug = freshOrg?.slug || createdOrg?.slug;
        if (slug) openPublicSite(slug);
        else navigate("dashboard");
      } else if (action === "whatsapp") {
        navigate("dashboard", { tab: "settings" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    }
  }

  // If the user already has an org, we're redirecting
  if (org) return null;

  // ---------- DECISION SCREEN: "Do you already have a website?" ----------
  if (mode === "choose") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-background to-background flex flex-col">
        <header className="border-b bg-white/85 backdrop-blur">
          <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-md bg-emerald-600 text-white">
              <Sparkles className="size-4" />
            </div>
            <span className="font-semibold text-slate-900">Lead Machine</span>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-3">
              <Sparkles className="size-3.5" /> Welcome to Lead Machine
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Do you already have a website?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Either way, you get AI lead capture, WhatsApp notifications, and a lead dashboard.
              We just change which door the leads walk through.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Build me a website */}
            <button
              type="button"
              onClick={() => setMode("generate")}
              className="group text-left rounded-2xl border-2 border-emerald-200 bg-white p-6 transition-all hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              <div className="mb-4 grid size-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700 group-hover:scale-110 transition-transform">
                <Wand2 className="size-5" />
              </div>
              <h2 className="font-semibold text-slate-900">No — build me one</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                AI writes your site in 60 seconds. Professional, mobile-ready, lead-capture built in.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                Generate a website <ArrowRight className="size-3.5" />
              </span>
            </button>

            {/* I already have a website */}
            <button
              type="button"
              onClick={() => setMode("embed")}
              className="group text-left rounded-2xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-emerald-500 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              <div className="mb-4 grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-700 group-hover:scale-110 transition-transform">
                <Code2 className="size-5" />
              </div>
              <h2 className="font-semibold text-slate-900">Yes — I have one</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep your current site. Paste one snippet and our lead form + WhatsApp bot appear on it.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-700 group-hover:text-emerald-700">
                Get the embed snippet <ArrowRight className="size-3.5" />
              </span>
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Don&apos;t worry — you can switch modes later from Settings.
          </p>
        </main>
      </div>
    );
  }

  // ---------- EMBED MODE: keep existing site, get a snippet ----------
  if (mode === "embed") {
    const embedSlug = (createdOrg?.slug || businessName.trim())
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50);
    const snippet = `<script src="https://leadmachine.app/embed.js?slug=${embedSlug}" async></script>`;

    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-background to-background">
        <header className="sticky top-0 z-20 border-b bg-white/85 backdrop-blur">
          <div className="mx-auto max-w-2xl px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => {
                  if (embedStep === 1) setMode("choose");
                  else setEmbedStep(1);
                }}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900"
              >
                <ArrowLeft className="size-4" /> Back
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("flex size-7 items-center justify-center rounded-full text-xs font-semibold", embedStep >= 1 ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground")}>1</div>
              <span className={cn("text-xs", embedStep >= 1 ? "text-emerald-700 font-medium" : "text-muted-foreground")}>Your business</span>
              <div className="flex-1 h-0.5 mx-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-600 transition-all" style={{ width: embedStep >= 2 ? "100%" : "0%" }} />
              </div>
              <div className={cn("flex size-7 items-center justify-center rounded-full text-xs font-semibold", embedStep >= 2 ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground")}>2</div>
              <span className={cn("text-xs hidden sm:inline", embedStep >= 2 ? "text-emerald-700 font-medium" : "text-muted-foreground")}>Embed snippet</span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
          <Card className="shadow-sm border-emerald-100/60">
            <CardContent className="p-6 sm:p-8 min-h-[420px]">
              <AnimatePresence mode="wait">
                {embedStep === 1 && (
                  <motion.div key="embed1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-3">
                        <Code2 className="size-3.5" /> Embed mode
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight">Tell us about your business</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        We&apos;ll set up the lead engine. You keep your existing website.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="embBusinessName">Business name <span className="text-rose-500">*</span></Label>
                      <Input id="embBusinessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="MVR Law" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="embIndustry">Industry <span className="text-rose-500">*</span></Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger id="embIndustry" className="w-full"><SelectValue placeholder="Select your industry" /></SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map((i) => (
                            <SelectItem key={i.value} value={i.value}>
                              <span className="mr-1.5">{INDUSTRY_PRESETS[i.value]?.emoji ?? "✨"}</span>{i.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="embUrl">Your existing website URL <span className="text-rose-500">*</span></Label>
                      <Input id="embUrl" value={existingSiteUrl} onChange={(e) => setExistingSiteUrl(e.target.value)} placeholder="https://mvrlaw.co.za" inputMode="url" />
                      <p className="text-xs text-muted-foreground">We&apos;ll add a floating lead-capture widget to this site.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="embWhatsapp">WhatsApp number for lead notifications <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Input id="embWhatsapp" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+27 82 123 4567" inputMode="tel" />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => {
                          if (!embedStep1Valid) { toast.error("Please fill in all required fields"); return; }
                          setEmbedStep(2);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Get my snippet <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {embedStep === 2 && (
                  <motion.div key="embed2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-5">
                    {embedCreating ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Loader2 className="size-10 animate-spin text-emerald-600 mb-4" />
                        <h2 className="text-lg font-semibold">Setting up your lead engine…</h2>
                        <p className="text-sm text-muted-foreground mt-1">Creating your dashboard and snippet.</p>
                      </div>
                    ) : embedCreated ? (
                      <>
                        <div className="text-center mb-6">
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-emerald-100">
                            <CheckCircle2 className="size-9 text-emerald-600" />
                          </motion.div>
                          <h2 className="text-2xl font-bold tracking-tight">Your lead engine is ready! 🎉</h2>
                          <p className="text-sm text-muted-foreground mt-1">
                            Paste this snippet before the <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">&lt;/body&gt;</code> tag on your existing website.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-1.5"><Code2 className="size-3.5" /> Embed snippet</Label>
                          <pre className="rounded-xl border bg-slate-900 p-4 text-xs text-emerald-300 overflow-x-auto"><code>{snippet}</code></pre>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => { navigator.clipboard?.writeText(snippet); toast.success("Snippet copied to clipboard"); }}
                          >
                            <Copy className="size-3.5" /> Copy snippet
                          </Button>
                        </div>

                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800">
                          <p className="font-semibold mb-1">📝 Note</p>
                          <p>The floating embed widget ships in v1.1. For now, use your Lead Machine campaign page at <code className="rounded bg-amber-100 px-1 py-0.5">/?site={embedSlug}</code> as a dedicated landing page for ads and WhatsApp links.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button onClick={handleAction.bind(null, "dashboard")} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Rocket className="size-4" /> Go to Dashboard
                          </Button>
                          <Button onClick={handleAction.bind(null, "whatsapp")} variant="outline" className="flex-1">
                            <MessageCircle className="size-4" /> Open Settings
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <p className="text-sm text-muted-foreground">Something went wrong. Go back and try again.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ---------- GENERATE MODE: the existing 4-step wizard ----------
  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;
  const industryPreset = industry ? INDUSTRY_PRESETS[industry] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-background to-background">
      {/* Top progress bar */}
      <header className="sticky top-0 z-20 border-b bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                      step > s.id
                        ? "bg-emerald-600 text-white"
                        : step === s.id
                        ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step > s.id ? <Check className="size-4" /> : s.id}
                  </div>
                  <span
                    className={cn(
                      "text-xs hidden sm:inline transition-colors",
                      step >= s.id
                        ? "text-emerald-700 font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 sm:mx-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-500"
                      style={{ width: step > s.id ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <Card className="shadow-sm border-emerald-100/60">
          <CardContent className="p-6 sm:p-8 min-h-[420px]">
            <AnimatePresence mode="wait">
              {/* STEP 1 — Business */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-3">
                      <Sparkles className="size-3.5" /> Step 1 of 4
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Tell us about your business</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      This powers your website copy, lead qualification, and WhatsApp alerts.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessName">
                      Business name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="MVR Law"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">
                      Industry <span className="text-rose-500">*</span>
                    </Label>
                    <Select value={industry} onValueChange={setIndustry}>
                      <SelectTrigger id="industry" className="w-full">
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((i) => (
                          <SelectItem key={i.value} value={i.value}>
                            <span className="mr-1.5">{INDUSTRY_PRESETS[i.value]?.emoji ?? "✨"}</span>
                            {i.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="services">
                      Services you offer <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      id="services"
                      value={services}
                      onChange={(e) => setServices(e.target.value)}
                      placeholder="e.g. Company registrations, Contract drafting, Litigation, Legal advisory"
                      className="min-h-24"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated or one per line. The AI uses these to write your website.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">
                      WhatsApp number for lead notifications{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="whatsapp"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="+27 82 123 4567"
                      inputMode="tel"
                    />
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll ping you the moment a hot lead lands. You can connect WhatsApp later.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STEP 2 — Style */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-3">
                      <Palette className="size-3.5" /> Step 2 of 4
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Pick your style</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose a template and brand color. You can change these anytime.
                    </p>
                  </div>

                  <div>
                    <Label className="mb-2 block">Template</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {TEMPLATES.map((t) => {
                        const selected = template === t.value;
                        return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => setTemplate(t.value)}
                            className={cn(
                              "text-left rounded-xl border p-4 transition-all relative",
                              selected
                                ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                                : "border-border hover:border-emerald-300 hover:bg-emerald-50/30"
                            )}
                          >
                            {selected && (
                              <div className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                                <Check className="size-3.5" />
                              </div>
                            )}
                            <div className="font-semibold text-sm">{t.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Brand color</Label>
                    <div className="flex flex-wrap items-center gap-3">
                      {COLOR_PALETTE.map((c) => {
                        const selected = primaryColor.toLowerCase() === c.value.toLowerCase();
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setPrimaryColor(c.value)}
                            aria-label={c.name}
                            className={cn(
                              "size-10 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all flex items-center justify-center",
                              selected ? "ring-foreground scale-110" : "ring-transparent hover:scale-105"
                            )}
                            style={{ backgroundColor: c.value }}
                          >
                            {selected && <Check className="size-4 text-white" />}
                          </button>
                        );
                      })}
                      {industryPreset && (
                        <span className="text-xs text-muted-foreground ml-1">
                          Suggested for {INDUSTRIES.find((i) => i.value === industry)?.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live preview */}
                  <div className="rounded-xl border overflow-hidden">
                    <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 flex items-center gap-2">
                      <Globe className="size-3.5" /> Live preview
                    </div>
                    <div className="p-5">
                      <div
                        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {industryPreset?.emoji ?? "✨"} {businessName || "Your Business"}
                      </div>
                      <h3 className="mt-4 text-xl font-bold tracking-tight">
                        {businessName ? `${businessName} — working for you.` : "Your headline appears here."}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2 max-w-md">
                        Trusted {INDUSTRIES.find((i) => i.value === industry)?.label ?? "services"} for South
                        African businesses. Get a quote in 24 hours.
                      </p>
                      <button
                        type="button"
                        className="mt-4 rounded-md px-4 py-2 text-xs font-semibold text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Get a Free Quote
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 — AI Build */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-3">
                      <Wand2 className="size-3.5" /> Step 3 of 4
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">AI builds your website</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      We&apos;re writing copy tailored to {businessName || "your business"}.
                    </p>
                  </div>

                  {generating && (
                    <div className="rounded-xl border bg-emerald-50/40 p-8 text-center">
                      <div className="relative mx-auto mb-4 flex size-14 items-center justify-center">
                        <motion.div
                          className="absolute inset-0 rounded-full bg-emerald-200/50"
                          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <Sparkles className="size-7 text-emerald-600" />
                      </div>
                      <div className="font-semibold text-emerald-800">AI is writing your website copy... ✨</div>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={loadingMsg}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.3 }}
                          className="text-sm text-emerald-700 mt-2 flex items-center justify-center gap-2"
                        >
                          <Loader2 className="size-3.5 animate-spin" />
                          {loadingMsg}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  )}

                  {!generating && generatedWebsite && (
                    <div className="space-y-4">
                      <div className="rounded-xl border overflow-hidden">
                        <div className="px-4 py-2.5 text-xs font-medium text-muted-foreground bg-muted/50 flex items-center justify-between">
                          <span>Preview</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              generateFiredRef.current = true;
                              void runGenerate();
                            }}
                          >
                            <RefreshCw className="size-3.5" /> Regenerate
                          </Button>
                        </div>
                        <div className="p-5 space-y-4">
                          {generatedWebsite.heroHeadline && (
                            <div>
                              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                Headline
                              </div>
                              <h3 className="mt-1 text-lg font-bold tracking-tight">
                                {generatedWebsite.heroHeadline}
                              </h3>
                              {generatedWebsite.heroSubtext && (
                                <p className="text-sm text-muted-foreground mt-1.5">
                                  {generatedWebsite.heroSubtext}
                                </p>
                              )}
                            </div>
                          )}
                          {generatedWebsite.aboutText && (
                            <div>
                              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                About
                              </div>
                              <p className="mt-1 text-sm leading-relaxed">
                                {generatedWebsite.aboutText}
                              </p>
                            </div>
                          )}
                          {generatedWebsite.services?.length > 0 && (
                            <div>
                              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                Services
                              </div>
                              <ul className="mt-2 space-y-2">
                                {generatedWebsite.services.slice(0, 3).map((s, i) => (
                                  <li key={i} className="flex items-start gap-2.5">
                                    <div
                                      className="mt-1 size-1.5 shrink-0 rounded-full"
                                      style={{ backgroundColor: primaryColor }}
                                    />
                                    <div>
                                      <div className="text-sm font-medium">{s.name}</div>
                                      <div className="text-xs text-muted-foreground">{s.description}</div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!generating && !generatedWebsite && (
                    <div className="rounded-xl border border-dashed p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Something went wrong. Try again?
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          generateFiredRef.current = true;
                          void runGenerate();
                        }}
                      >
                        <RefreshCw className="size-4" /> Retry
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 4 — Live */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 relative"
                >
                  {/* Confetti burst */}
                  <div className="pointer-events-none absolute inset-x-0 -top-4 h-0 overflow-visible">
                    {CONFETTI.map((emoji, i) => (
                      <motion.span
                        key={i}
                        className="absolute text-xl"
                        style={{ left: `${12 + i * 14}%` }}
                        initial={{ y: -10, opacity: 0, scale: 0.5 }}
                        animate={{
                          y: [0, 120, 200],
                          opacity: [1, 1, 0],
                          scale: [1, 1.2, 0.8],
                          rotate: [0, 180, 360],
                        }}
                        transition={{ duration: 2.2, delay: i * 0.12, ease: "easeOut" }}
                      >
                        {emoji}
                      </motion.span>
                    ))}
                  </div>

                  <div className="text-center pt-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                      className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100"
                    >
                      <CheckCircle2 className="size-9 text-emerald-600" />
                    </motion.div>
                    <h2 className="text-2xl font-bold tracking-tight">Your website is ready 🎉</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      We&apos;ve published your starter site. Time to start collecting leads.
                    </p>
                  </div>

                  {/* URL preview */}
                  <div className="rounded-xl border bg-muted/40 p-4">
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">
                      Your public URL
                    </div>
                    {creatingOrg ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Reserving your URL...
                      </div>
                    ) : createdOrg ? (
                      <div className="flex items-center gap-2">
                        <Globe className="size-4 text-emerald-600 shrink-0" />
                        <code className="text-sm font-semibold text-emerald-700 truncate">
                          leadmachine.app/s/{createdOrg.slug}
                        </code>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Preparing your URL...</div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button
                      onClick={() => handleAction("dashboard")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-auto py-3 flex flex-col items-center gap-1.5"
                    >
                      <Rocket className="size-5" />
                      <span className="text-sm font-semibold">Go to Dashboard</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAction("preview")}
                      className="h-auto py-3 flex flex-col items-center gap-1.5 border-emerald-200 hover:bg-emerald-50"
                    >
                      <ExternalLink className="size-5 text-emerald-600" />
                      <span className="text-sm font-semibold">Preview my Website</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAction("whatsapp")}
                      className="h-auto py-3 flex flex-col items-center gap-1.5 border-emerald-200 hover:bg-emerald-50"
                    >
                      <MessageCircle className="size-5 text-emerald-600" />
                      <span className="text-sm font-semibold">Connect WhatsApp</span>
                    </Button>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Signed in as {user?.email}. Welcome to Lead Machine.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Nav buttons (hidden on step 4) */}
        {step < 4 && (
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1 || generating}
              className="text-muted-foreground"
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={
                (step === 1 && !step1Valid) ||
                (step === 2 && !step2Valid) ||
                (step === 3 && !step3Valid) ||
                generating
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {step === 3 ? "Finish Setup" : "Next"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
