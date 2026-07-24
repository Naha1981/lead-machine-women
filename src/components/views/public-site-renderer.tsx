"use client";
// Lead Machine — reusable dark-site renderer.
// Takes org + website data as props (no fetching). Used by:
//   - src/app/s/[slug]/page.tsx (Server Component, direct service call)
//   - src/components/views/public-site-view.tsx (SPA fallback via /?site=slug)
// Visuals are identical to the approved dark template — this is a thin adapter
// around the existing PublicSiteContent presentational component.
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PublicSiteContent, type PublicOrg, type PublicWebsite } from "@/components/views/public-site-view";
import { ChatWidget } from "@/components/ai/chat-widget";
import { useAppStore } from "@/store/app-store";

export function PublicSiteRenderer({
  org,
  website,
  showBackToDashboard = true,
}: {
  org: PublicOrg;
  website: PublicWebsite;
  showBackToDashboard?: boolean;
}) {
  const navigate = useAppStore((s) => s.navigate);
  const user = useAppStore((s) => s.user);
  const [contactRef, setContactRef] = useState<HTMLDivElement | null>(null);
  const brand = org.primaryColor || "#10b981";

  return (
    <div
      className="min-h-screen bg-[#0a0a0a]"
      style={{ ["--brand" as any]: brand }}
    >
      {/* Back to dashboard (only for logged-in owners viewing their own site) */}
      {showBackToDashboard && user && (
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
