import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedWebsiteBySlug } from "@/modules/websites/service";
import { StandaloneLeadMachine } from "@/components/public/standalone-lead-machine";
import type { PublicOrg, PublicWebsite } from "@/components/views/public-site-view";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

async function loadSite(slug: string) {
  const view = await getPublishedWebsiteBySlug(slug);
  if (!view) notFound();
  return {
    org: view.org as PublicOrg,
    website: view.website as PublicWebsite,
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  try {
    const site = await loadSite(slug);
    return {
      title: `Enquire with ${site.org.name} | Lead Machine`,
      description:
        site.website.heroSubtext ||
        `Make a direct enquiry with ${site.org.name} through its Lead Machine conversion channel.`,
    };
  } catch {
    return { title: "Lead Machine enquiry" };
  }
}

export default async function StandaloneLeadPage({ params }: Params) {
  const { slug } = await params;
  const site = await loadSite(slug);
  return <StandaloneLeadMachine org={site.org} website={site.website} />;
}
