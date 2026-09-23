"use client";
// Lead Machine — single-route SPA view router (Phase 3a: canonical /s/[slug] redirect)
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useAppStore } from "@/store/app-store";
import { apiClient } from "@/lib/api-client";
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

export default function AuthenticatedHome() {
  const view = useAppStore((s) => s.view);
  const user = useAppStore((s) => s.user);
  const org = useAppStore((s) => s.org);
  const sessionLoading = useAppStore((s) => s.sessionLoading);
  const setSession = useAppStore((s) => s.setSession);
  const setSessionLoading = useAppStore((s) => s.setSessionLoading);
  const navigate = useAppStore((s) => s.navigate);
  const router = useRouter();

  // Clerk is the source of truth for identity (Phase 2).
  const { isLoaded, isSignedIn } = useUser();

  // Canonical URL: /?site=slug redirects to /s/[slug] (the real public route).
  // Old demo links and the dashboard's "View my site" button keep working.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const siteSlug = params.get("site");
    if (siteSlug) {
      router.replace(`/s/${encodeURIComponent(siteSlug)}`);
    }
  }, [router]);

  // When Clerk auth state changes, fetch the bridged org info from our API.
  // The API uses auth() server-side to identify the Clerk user and bridges
  // to our users table via getOrCreateUserByClerkId.
  useEffect(() => {
    if (!isLoaded) return; // Clerk still loading
    if (!isSignedIn) {
      setSession(null, null);
      return;
    }
    // Signed in — fetch org info from our API (which uses Clerk auth()).
    let cancelled = false;
    (async () => {
      try {
        const { user, org } = await apiClient.me();
        if (!cancelled) setSession(user, org);
      } catch {
        if (!cancelled) setSession(null, null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, setSession]);

  // Guard: if trying to view dashboard/onboarding without auth, bounce to landing.
  // NOTE: view === "public" never gets redirected — public sites are open to everyone.
  useEffect(() => {
    if (!isLoaded) return; // wait for Clerk
    if (view === "public") return;
    if (!isSignedIn && (view === "dashboard" || view === "onboarding")) {
      navigate("auth");
    }
    // if user is logged in but on landing/auth and has org → go dashboard
    if (isSignedIn && user && org && (view === "landing" || view === "auth")) {
      navigate("dashboard");
    }
    // if user logged in, no org, and on landing/auth → go onboarding
    if (isSignedIn && user && !org && (view === "landing" || view === "auth")) {
      navigate("onboarding");
    }
  }, [isLoaded, isSignedIn, user, org, view, navigate]);

  // Loading gate on first paint — but NOT if we're showing a public site
  if (view === "public") return <PublicSiteView />;

  if (!isLoaded || sessionLoading) {
    return <FullPageSkeleton />;
  }

  if (view === "auth") {
    // If already signed in, don't show the auth view — go to onboarding/dashboard
    if (isSignedIn && user) {
      return org ? <DashboardView /> : <OnboardingView />;
    }
    return <AuthView />;
  }
  if (view === "onboarding") {
    if (!isSignedIn || !user) return <AuthView />;
    return <OnboardingView />;
  }
  if (view === "dashboard") {
    if (!isSignedIn || !user) return <AuthView />;
    return <DashboardView />;
  }

  // default: landing
  return <LandingView />;
}
