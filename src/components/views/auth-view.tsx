"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAppStore } from "@/store/app-store";

export default function AuthView() {
  const navigate = useAppStore((s) => s.navigate);
  const authMode = useAppStore((s) => s.authMode);
  const setAuthMode = useAppStore((s) => s.setAuthMode);

  const isSignup = authMode === "signup";

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <button
            onClick={() => navigate("landing")}
            className="flex items-center gap-2 text-left"
          >
            <div className="grid size-8 place-items-center rounded-md bg-white/20 backdrop-blur">
              <span className="text-lg">⚡</span>
            </div>
            <span className="font-bold text-lg">Lead Machine</span>
          </button>

          <div className="space-y-6">
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
              Your business gets a website that turns visitors into paying clients while you sleep.
            </h1>
            <ul className="space-y-3 text-emerald-50">
              <li className="flex items-center gap-2">
                <span className="text-white">✓</span> AI generates your professional website in 60 seconds
              </li>
              <li className="flex items-center gap-2">
                <span className="text-white">✓</span> Every lead is AI-qualified (Hot / Warm / Cold)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-white">✓</span> WhatsApp notifications in under 10 seconds
              </li>
            </ul>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
            <p className="text-sm text-emerald-50 italic">
              &ldquo;I want enquiries to come in and someone to respond immediately.&rdquo;
            </p>
            <p className="mt-2 text-xs text-emerald-100 font-medium">
              — Nonkosi M., MVR Law
            </p>
          </div>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center gap-2 p-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("landing")}>
            <ArrowLeft className="size-4" />
            Back to home
          </Button>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md space-y-4">
            {/* Toggle between sign in / sign up */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setAuthMode("signup")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  isSignup ? "bg-white text-slate-900 shadow-sm" : "text-muted-foreground"
                }`}
              >
                Sign Up
              </button>
              <button
                onClick={() => setAuthMode("signin")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  !isSignup ? "bg-white text-slate-900 shadow-sm" : "text-muted-foreground"
                }`}
              >
                Sign In
              </button>
            </div>

            {/* Clerk component — routing="hash" since we're in a single-route SPA.
                After sign-in/sign-up, redirect to / so the Zustand router can
                detect the Clerk user and navigate to onboarding or dashboard. */}
            <div className="flex justify-center">
              {isSignup ? (
                <SignUp
                  routing="hash"
                  fallbackRedirectUrl="/"
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "bg-white border border-slate-200 shadow-lg w-full",
                      headerTitle: "text-slate-900",
                      headerSubtitle: "text-slate-600",
                      formButtonPrimary:
                        "bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium",
                      formFieldLabel: "text-slate-700",
                      formFieldInput:
                        "border border-slate-200 text-slate-900 placeholder:text-slate-400",
                      footerActionLink: "text-emerald-600 hover:text-emerald-700",
                      socialButtonsBlockButton:
                        "border border-slate-200 text-slate-700 hover:bg-slate-50",
                      socialButtonsBlockButtonText: "text-slate-700",
                    },
                  }}
                />
              ) : (
                <SignIn
                  routing="hash"
                  fallbackRedirectUrl="/"
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "bg-white border border-slate-200 shadow-lg w-full",
                      headerTitle: "text-slate-900",
                      headerSubtitle: "text-slate-600",
                      formButtonPrimary:
                        "bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium",
                      formFieldLabel: "text-slate-700",
                      formFieldInput:
                        "border border-slate-200 text-slate-900 placeholder:text-slate-400",
                      footerActionLink: "text-emerald-600 hover:text-emerald-700",
                      socialButtonsBlockButton:
                        "border border-slate-200 text-slate-700 hover:bg-slate-50",
                      socialButtonsBlockButtonText: "text-slate-700",
                    },
                  }}
                />
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              After signing in, you&apos;ll be redirected to set up your business.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
