import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Website Revenue Leak Audit | NahaLabs",
  description:
    "Enter your business website and get a free diagnosis of conversion, trust, mobile and technical leaks — plus a concrete fix plan.",
  alternates: {
    canonical: "/audit",
  },
  openGraph: {
    title: "Free Website Revenue Leak Audit | NahaLabs",
    description:
      "Find where your website is losing enquiries and see what to fix first.",
    type: "website",
  },
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return children;
}
