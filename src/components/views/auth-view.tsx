"use client";
// Lead Machine — auth view (Phase 3a: redirects to real /login + /signup routes).
// This view is kept for backward compat with the Zustand view-router. It simply
// redirects to the real Clerk path-routed auth pages. After sign-in/sign-up,
// Clerk's fallbackRedirectUrl="/" sends the user back to the SPA which detects
// the Clerk user and navigates to onboarding/dashboard.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";

export default function AuthView() {
  const router = useRouter();
  const authMode = useAppStore((s) => s.authMode);

  useEffect(() => {
    // Redirect to the real Clerk auth page (path routing, no hash)
    router.replace(authMode === "signin" ? "/login" : "/signup");
  }, [authMode, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">Redirecting…</div>
    </div>
  );
}
