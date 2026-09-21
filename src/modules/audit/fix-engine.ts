import type { AuditFinding, AuditResult } from "@/modules/audit/engine";

export type FixPack = {
  auditDomain: string;
  objective: string;
  priorityActions: Array<{
    findingId: string;
    severity: AuditFinding["severity"];
    action: string;
    acceptanceTest: string;
  }>;
  conversion: {
    primaryCta: string;
    whatsappMessage: string;
    formFields: string[];
    placement: string[];
  };
  seo: {
    title: string;
    metaDescription: string;
    h1: string;
    canonical: string;
  };
  local: {
    recommended: boolean;
    schemaTemplate: Record<string, unknown> | null;
  };
  technical: {
    robots: string;
    sitemap: string;
  };
  acceptanceTests: string[];
};

function cleanWords(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function deriveService(audit: AuditResult): string {
  const h1 = cleanWords(audit.domain.replace(/^www\./i, "").split(".")[0] || "");
  return h1 ? h1.replace(/[-_]+/g, " ") : "your service";
}

function findFix(findings: AuditFinding[], id: string, fallback: string) {
  return findings.find((item) => item.id === id)?.fixAction ?? fallback;
}

export function buildFixPack(audit: AuditResult): FixPack {
  const service = deriveService(audit);
  const h1 = audit.findings.some((item) => item.id === "missing-h1")
    ? `Get ${service} without the usual friction.`
    : `Turn ${service} visitors into enquiries.`;

  const title = `${service} | ${audit.domain}`.slice(0, 65);
  const metaDescription = `Clear ${service} information, proof and a direct enquiry path for customers of ${audit.domain}.`.slice(0, 155);

  const priority = audit.findings.slice(0, 6).map((item) => ({
    findingId: item.id,
    severity: item.severity,
    action: item.fixAction,
    acceptanceTest:
      item.id === "missing-cta"
        ? "A visitor can identify and activate one primary CTA without hunting."
        : item.id === "missing-whatsapp"
          ? "A visitor can start a WhatsApp conversation from the first screen."
          : item.id === "missing-proof"
            ? "At least three credible proof points are visible before or beside the main CTA."
            : item.id === "missing-viewport"
              ? "The page is readable and actionable at 360px viewport width."
              : `The ${item.fixTitle.toLowerCase()} change is visible on the published page and survives a hard refresh.`,
  }));

  const needsWhatsapp = audit.findings.some((item) => item.id === "missing-whatsapp");
  const needsForm = audit.findings.some((item) => ["missing-contact", "missing-booking"].includes(item.id));
  const localRecommended = audit.findings.some((item) => item.id === "missing-local-signal");

  return {
    auditDomain: audit.domain,
    objective: "Remove the highest-impact conversion friction before sending more traffic.",
    priorityActions: priority,
    conversion: {
      primaryCta: needsWhatsapp ? "Chat on WhatsApp" : "Request a quote",
      whatsappMessage: `Hi ${audit.domain} — I’m interested in your service. Please send me the next steps.`,
      formFields: needsForm ? ["Name", "Phone / WhatsApp", "What do you need?"] : ["Name", "Phone / WhatsApp"],
      placement: [
        "Hero / first screen",
        "Immediately after the strongest proof point",
        "Bottom of mobile page",
      ],
    },
    seo: {
      title,
      metaDescription,
      h1,
      canonical: audit.finalUrl.split("?")[0],
    },
    local: {
      recommended: localRecommended,
      schemaTemplate: localRecommended
        ? {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "[BUSINESS NAME]",
            url: audit.finalUrl.split("?")[0],
            areaServed: ["Johannesburg", "Gauteng", "South Africa"],
            telephone: "[PHONE]",
          }
        : null,
    },
    technical: {
      robots: `User-agent: *\nAllow: /\nSitemap: ${audit.finalUrl.replace(/\/$/, "")}/sitemap.xml`,
      sitemap: `Publish the canonical commercial URLs and reference them from ${audit.finalUrl.replace(/\/$/, "")}/sitemap.xml`,
    },
    acceptanceTests: [
      "Open the page in a private browser window and complete the primary CTA path.",
      "Test the page at 360px width and confirm the CTA remains visible and usable.",
      "Validate the final title, meta description, H1 and canonical against the published HTML.",
      needsWhatsapp ? "Send a real WhatsApp test message and confirm the business receives it." : "Complete a real enquiry and confirm the business receives it.",
      localRecommended ? "Validate the LocalBusiness JSON-LD for valid syntax and accurate business details." : "Verify the technical SEO changes survive a production deploy.",
    ],
  };
}
