"use client";
// Lead Machine — single-route SPA view router
import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { useSessionHydration } from "@/lib/api-client";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Static imports for fast first paint of the most-likely views
import LandingView from "@/components/views/landing-view";
import AuthView from "@/components/views/auth-view";

// Lazy-load heavier views
const OnboardingView = dynamic(() => import("@/components/views/onboarding-view"));
const DashboardView = dynamic(
  () => import("@/components/views/dashboard-view"),
  { loading: () => <FullPageSkeleton /> }
);
const PublicSiteView = dynamic(
  () => import("@/components/views/public-site-view"),
  { loading: () => <FullPageSkeleton /> }
);

function FullPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Skeleton className="h-16 w-full rounded-none" />
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-4 w-full max-w-2xl mb-3" />
        <Skeleton className="h-4 w-full max-w-xl mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const view = useAppStore((s) => s.view);
  const user = useAppStore((s) => s.user);
  const org = useAppStore((s) => s.org);
  const sessionLoading = useAppStore((s) => s.sessionLoading);
  const setSession = useAppStore((s) => s.setSession);
  const setSessionLoading = useAppStore((s) => s.setSessionLoading);
  const navigate = useAppStore((s) => s.navigate);

  // Hydrate session once on mount
  useSessionHydration({
    setUser: setSession,
    setLoading: setSessionLoading,
    user,
    org,
  });

  // Guard: if trying to view dashboard/onboarding without auth, bounce to landing
  useEffect(() => {
    if (sessionLoading) return;
    if (!user && (view === "dashboard" || view === "onboarding")) {
      navigate("auth");
    }
    // if user is logged in but on landing/auth and has org → go dashboard
    if (user && org && (view === "landing" || view === "auth")) {
      navigate("dashboard");
    }
    // if user logged in, no org, and on landing/auth/onboarding-mid → go onboarding
    if (user && !org && view === "landing") {
      navigate("onboarding");
    }
  }, [user, org, view, sessionLoading, navigate]);

  // Loading gate on first paint
  if (sessionLoading) {
    return <FullPageSkeleton />;
  }

  if (view === "auth") return <AuthView />;
  if (view === "onboarding") {
    if (!user) return <AuthView />;
    return <OnboardingView />;
  }
  if (view === "dashboard") {
    if (!user) return <AuthView />;
    return <DashboardView />;
  }
  if (view === "public") return <PublicSiteView />;

  // default: landing
  return <LandingView />;
}
