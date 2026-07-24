"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { INDUSTRIES } from "@/lib/constants";

const BRAND_BULLETS = [
  "AI writes your site in 60 seconds",
  "Every lead is qualified & scored automatically",
  "WhatsApp notifications the moment a lead lands",
];

export default function AuthView() {
  const authMode = useAppStore((s) => s.authMode);
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const navigate = useAppStore((s) => s.navigate);
  const setSession = useAppStore((s) => s.setSession);

  const isSignup = authMode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createWebsite, setCreateWebsite] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()))
      return "Please enter a valid email address";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (isSignup && createWebsite) {
      if (!businessName.trim()) return "Please enter your business name";
      if (!industry) return "Please select your industry";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        await apiClient.signup({
          name: name.trim() || undefined,
          email: email.trim(),
          password,
          businessName: createWebsite ? businessName.trim() : undefined,
          industry: createWebsite ? industry : undefined,
        });
        toast.success("Account created! Setting up your workspace...");
      } else {
        await apiClient.signin({ email: email.trim(), password });
        toast.success("Welcome back!");
      }
      // Refresh session — store auto-routes to dashboard (org exists) or onboarding (no org)
      const { user, org } = await apiClient.me();
      setSession(user, org);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex lg:flex-col bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-10 text-white overflow-hidden">
        {/* Decorative blurs */}
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-teal-200/20 blur-3xl" />

        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate("landing")}
          className="relative z-10 inline-flex items-center gap-2 group w-fit"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur ring-1 ring-white/20 group-hover:bg-white/25 transition-colors">
            <Sparkles className="size-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Lead Machine</span>
        </button>

        {/* Headline + bullets */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-md py-12">
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight">
            Your business gets a website that turns visitors into paying clients while you sleep.
          </h1>
          <ul className="mt-8 space-y-3">
            {BRAND_BULLETS.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check className="size-3.5" />
                </div>
                <span className="text-emerald-50">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Testimonial */}
        <figure className="relative z-10 rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-5 max-w-md">
          <blockquote className="text-emerald-50 text-sm leading-relaxed">
            &ldquo;We got 14 qualified leads in our first week. The AI even screened out the
            tyre-kickers before they reached my phone.&rdquo;
          </blockquote>
          <figcaption className="mt-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white font-semibold">
              N
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Nonkosi</div>
              <div className="text-xs text-emerald-100">MVR Law &middot; Sandton</div>
            </div>
          </figcaption>
        </figure>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col p-6 sm:p-10">
        {/* Mobile header */}
        <div className="lg:hidden mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("landing")}
            className="inline-flex items-center gap-2"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Sparkles className="size-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-emerald-700">Lead Machine</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate("landing")}>
            <ArrowLeft className="size-4" /> Home
          </Button>
        </div>

        {/* Desktop back link */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("landing")}
          className="hidden lg:inline-flex w-fit -ml-2 mb-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to home
        </Button>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight">
                {isSignup ? "Start your free trial" : "Welcome back"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isSignup
                  ? "7 days free. No card required. Cancel anytime."
                  : "Sign in to your Lead Machine dashboard."}
              </p>
            </div>

            {/* Mode toggle */}
            <div className="mb-6 grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={cn(
                  "rounded-md py-2 text-sm font-medium transition-all",
                  isSignup
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className={cn(
                  "rounded-md py-2 text-sm font-medium transition-all",
                  !isSignup
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence initial={false}>
                {isSignup && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label htmlFor="name">
                      Name <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Thabo Molefe"
                      autoComplete="name"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.co.za"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isSignup && (
                  <motion.div
                    key="website-block"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <label
                      htmlFor="createWebsite"
                      className="flex items-start gap-3 rounded-lg border bg-emerald-50/60 p-3 cursor-pointer hover:bg-emerald-50 transition-colors"
                    >
                      <Checkbox
                        id="createWebsite"
                        checked={createWebsite}
                        onCheckedChange={(v) => setCreateWebsite(!!v)}
                        className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          <Zap className="size-3.5 text-emerald-600" />
                          Create my business website now
                        </div>
                        <div className="text-xs text-muted-foreground">
                          We&apos;ll generate a starter site you can edit later.
                        </div>
                      </div>
                    </label>

                    <AnimatePresence initial={false}>
                      {createWebsite && (
                        <motion.div
                          key="website-fields"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 overflow-hidden"
                        >
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
                                    {i.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-sm font-semibold shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Please wait...
                  </>
                ) : isSignup ? (
                  "Start Free Trial"
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {isSignup ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setAuthMode("signin")}
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setAuthMode("signup")}
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    Sign up free
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
