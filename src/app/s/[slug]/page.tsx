// Lead Machine — REAL public site route at /s/[slug]
// Server Component. Renders the dark generated site for any published business.
// NO AUTH REQUIRED — this is the URL that goes in sales emails.
//
// Data flow: PRIMARY = direct server-side service call to getPublishedWebsiteBySlug()
// (NOT an HTTP call to our own API). FALLBACK = internal fetch to /api/website/public
// (only triggered when the direct call fails, e.g. PGlite-in-RSC dev issue).
// In production with Neon, the direct service call always succeeds.
import type { Metadata } from "next";
import { getPublishedWebsiteBySlug } from "@/modules/websites/service";
import { PublicSiteRenderer } from "@/components/views/public-site-renderer";
import { PublicSiteNotFound } from "@/components/views/public-site-not-found";
import type { PublicOrg, PublicWebsite } from "@/components/views/public-site-view";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

// SEO: dynamic metadata per business
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  try {
    const view = await fetchPublishedSite(slug);
    if (!view) return { title: "Site not live — Lead Machine" };
    return {
      title: view.website.heroHeadline || view.org.name,
      description: view.website.heroSubtext || `${view.org.name} — ${view.org.industry} services in South Africa`,
      openGraph: {
        title: view.website.heroHeadline || view.org.name,
        description: view.website.heroSubtext || "",
        siteName: view.org.name,
        type: "website",
      },
    };
  } catch {
    return { title: "Site not live — Lead Machine" };
  }
}

// Fetch published site data. PRIMARY: direct service call. FALLBACK: internal
// API fetch (for dev PGlite-in-RSC compatibility).
async function fetchPublishedSite(slug: string) {
  // PRIMARY: direct server-side service call (works in production with Neon)
  try {
    return await getPublishedWebsiteBySlug(slug);
  } catch (directError) {
    // FALLBACK: internal API fetch (works in dev with PGlite, where the
    // PGlite worker has a known issue in RSC context)
    console.warn("[/s/[slug]] direct service call failed, falling back to API:", (directError as Error)?.message);
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
      const res = await fetch(`${base}/api/website/public?slug=${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (fetchError) {
      console.error("[/s/[slug]] API fallback also failed:", (fetchError as Error)?.message);
      return null;
    }
  }
}

export default async function PublicSitePage({ params }: Params) {
  const { slug } = await params;

  let view;
  try {
    view = await fetchPublishedSite(slug);
  } catch (e) {
    console.error("[/s/[slug]]", e);
    return <PublicSiteNotFound />;
  }

  if (!view) {
    return <PublicSiteNotFound />;
  }

  const org = view.org as PublicOrg;
  const website = view.website as PublicWebsite;

  return (
    <PublicSiteRenderer
      org={org}
      website={website}
      showBackToDashboard={false}
    />
  );
}
