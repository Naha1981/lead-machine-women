"use client";
// Lead Machine — client navigation store (single-route SPA)
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppView, DashboardTab, Org, SessionUser } from "@/types";

type AppState = {
  // session (hydrated from /api/auth/me on mount; not persisted to avoid stale tokens)
  user: SessionUser | null;
  org: Org | null;
  sessionLoading: boolean;

  // navigation
  view: AppView;
  dashboardTab: DashboardTab;
  publicSlug: string | null;
  chatOpen: boolean;
  authMode: "signin" | "signup";

  // actions
  setSession: (user: SessionUser | null, org: Org | null) => void;
  setSessionLoading: (v: boolean) => void;
  navigate: (view: AppView, opts?: { tab?: DashboardTab; slug?: string }) => void;
  setDashboardTab: (tab: DashboardTab) => void;
  openPublicSite: (slug: string) => void;
  setChatOpen: (open: boolean) => void;
  setAuthMode: (mode: "signin" | "signup") => void;
  signOutLocal: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      org: null,
      sessionLoading: true,
      view: "landing",
      dashboardTab: "overview",
      publicSlug: null,
      chatOpen: false,
      authMode: "signup",

      setSession: (user, org) =>
        set((s) => ({
          user,
          org,
          sessionLoading: false,
          // auto-route based on session state
          view:
            user && org
              ? s.view === "auth" || s.view === "onboarding" || s.view === "landing"
                ? "dashboard"
                : s.view
              : user && !org
              ? s.view === "auth" || s.view === "landing"
                ? "onboarding"
                : s.view
              : "landing",
        })),
      setSessionLoading: (v) => set({ sessionLoading: v }),

      navigate: (view, opts) =>
        set((s) => ({
          view,
          dashboardTab: opts?.tab ?? s.dashboardTab,
          publicSlug: opts?.slug ?? null,
        })),
      setDashboardTab: (tab) => set({ dashboardTab: tab, view: "dashboard" }),
      openPublicSite: (slug) => set({ view: "public", publicSlug: slug }),
      setChatOpen: (open) => set({ chatOpen: open }),
      setAuthMode: (mode) => set({ authMode: mode }),

      signOutLocal: () =>
        set({
          user: null,
          org: null,
          view: "landing",
          dashboardTab: "overview",
          publicSlug: null,
        }),
    }),
    {
      name: "lm-nav",
      partialize: (s) => ({
        view: s.view,
        dashboardTab: s.dashboardTab,
        publicSlug: s.publicSlug,
        authMode: s.authMode,
      }),
    }
  )
);
