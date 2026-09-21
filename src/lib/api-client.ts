"use client";
// Lead Machine — client API helpers + hooks
import { useEffect, useState, useCallback } from "react";
import type { Lead, Org, SessionUser, Website, WhatsAppMessage, Subscription } from "@/types";

async function api<T = any>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    credentials: "include",
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as any)?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export const apiClient = {
  // Phase 2: auth is handled by Clerk. These server endpoints are kept for
  // the client store's session hydration (me) and backward-compat (signout).
  signout: () => api<{ ok: boolean }>("/api/auth/signout", { method: "POST" }),
  me: () => api<{ user: SessionUser | null; org: Org | null }>("/api/auth/me"),

  createOrg: (body: { name: string; industry: string; services?: string; whatsappNumber?: string; ownerPhone?: string; primaryColor?: string }) =>
    api<{ org: Org }>("/api/orgs", { method: "POST", body: JSON.stringify(body) }),
  updateOrg: (body: Partial<{ name: string; industry: string; services: string; whatsappNumber: string; ownerPhone: string; primaryColor: string; whatsappConnected: boolean }>) =>
    api<{ org: Org }>("/api/orgs", { method: "PUT", body: JSON.stringify(body) }),

  listLeads: (params?: { status?: string; temperature?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.temperature) q.set("temperature", params.temperature);
    return api<{ leads: Lead[] }>(`/api/leads${q.size ? `?${q}` : ""}`);
  },
  submitLead: (body: { slug: string; name: string; phone: string; email?: string; serviceNeeded?: string; message?: string; source?: "website" | "standalone"; consentGiven: boolean }) =>
    api<{ ok: boolean; leadId: string; score: number | null; temperature: string | null; ref: string }>("/api/leads", { method: "POST", body: JSON.stringify(body) }),
  updateLeadStatus: (id: string, status: Lead["status"]) =>
    api<{ lead: Lead }>(`/api/leads/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),

  generateWebsite: (body: { businessName: string; industry: string; services: string; template?: string }) =>
    api<{ website: Website }>("/api/ai/generate-website", { method: "POST", body: JSON.stringify(body) }),
  getWebsite: () => api<{ website: Website | null; org?: any }>("/api/website/get"),
  publishWebsite: (published: boolean) =>
    api<{ published: boolean }>("/api/website/publish", { method: "POST", body: JSON.stringify({ published }) }),
  getPublicWebsite: (slug: string) =>
    api<{ org: any; website: any }>(`/api/website/public?slug=${encodeURIComponent(slug)}`),

  runAudit: (url: string) =>
    api<{ audit: any }>("/api/audit", { method: "POST", body: JSON.stringify({ url }) }).then((data) => data.audit),

  listAuditProjects: () =>
    api<{ projects: any[] }>("/api/audit/projects"),

  createAuditProject: (audit: any) =>
    api<{ project: any }>("/api/audit/projects", { method: "POST", body: JSON.stringify({ audit }) }),

  updateAuditProjectStatus: (projectId: string, status: "diagnosed" | "approved" | "building" | "deployed" | "verified") =>
    api<{ project: any }>("/api/audit/projects", { method: "PATCH", body: JSON.stringify({ projectId, status }) }),

  getGitHubAuthorizationConfig: () =>
    api<{ configured: boolean; registrationUrl: string }>("/api/audit/projects/github/config"),
  startGitHubRepositoryAuthorization: (body: { projectId: string; repositoryFullName: string; authorizationConfirmed: true }) =>
    api<{ installUrl: string; repositoryFullName: string }>("/api/audit/projects/repository", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  buildAuditImplementation: (projectId: string) =>
    api<{ project: any; pullRequest: any; patch: any }>("/api/audit/projects/build", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    }),

  syncAuditImplementation: (projectId: string) =>
    api<{ project: any; github: any }>("/api/audit/projects/implementation/status", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    }),

  verifyAuditProject: (projectId: string) =>
    api<{ project: any; verification: any }>("/api/audit/projects/verify", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    }),

  reQualify: (leadId: string) =>
    api<{ lead: Lead; qualification: any }>("/api/ai/qualify-lead", { method: "POST", body: JSON.stringify({ leadId }) }),
  chat: async (body: { slug: string; message: string; history?: { role: "user" | "assistant"; content: string }[] }): Promise<{ reply: string }> => {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = (data as any)?.error?.message ?? (data as any)?.error ?? `Chat failed (${res.status})`;
      throw new Error(typeof msg === "string" ? msg : "Chat unavailable");
    }
    // The chat endpoint now returns a text stream (Vercel AI SDK toTextStreamResponse).
    // Read it as text for the full reply.
    const reply = await res.text();
    return { reply };
  },

  getWhatsappMessages: () => api<{ messages: WhatsAppMessage[] }>("/api/whatsapp/messages"),
  subscribe: (plan: "starter" | "growth" | "agency") =>
    api<{ ok: boolean; subscription: any }>("/api/billing/subscribe", { method: "POST", body: JSON.stringify({ plan }) }),
  getBilling: () => api<{ subscription: Subscription | null; orgPlan: string; trialEndsAt: string | null }>("/api/billing/subscribe"),
};

// NOTE: Phase 2 replaced the old useSessionHydration hook with Clerk's useUser().
// Auth state is now detected client-side via Clerk; the org/tenant info is
// fetched from /api/auth/me (which uses Clerk auth() server-side) when the
// Clerk user becomes available.

/** Generic async data fetch hook. */
export function useAsync<T>(fn: () => Promise<T>, deps: any[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    // Reset state via microtask to avoid synchronous setState in effect body
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });
    fn()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [...deps, nonce]);

  return { data, loading, error, reload, setData };
}
