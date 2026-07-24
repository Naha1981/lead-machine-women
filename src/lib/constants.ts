// Lead Machine — shared constants

export const INDUSTRIES = [
  { value: "legal", label: "Legal / Law Firm", template: "legal" },
  { value: "consulting", label: "Business Consulting", template: "professional" },
  { value: "hr", label: "HR / Recruitment", template: "professional" },
  { value: "coaching", label: "Coaching / Training", template: "professional" },
  { value: "wellness", label: "Wellness / Fitness", template: "wellness" },
  { value: "accounting", label: "Accounting / Tax", template: "professional" },
  { value: "construction", label: "Construction / QS", template: "construction" },
  { value: "insurance", label: "Insurance Broker", template: "professional" },
  { value: "other", label: "Other", template: "professional" },
] as const;

export const TEMPLATES = [
  { value: "professional", label: "Professional Services", description: "Clean, corporate, trust-building" },
  { value: "legal", label: "Legal Firm", description: "Authoritative, structured, credentials-first" },
  { value: "wellness", label: "Wellness Brand", description: "Warm, inviting, community-focused" },
  { value: "construction", label: "Construction / QS", description: "Bold, project-led, credibility" },
] as const;

export const PLANS = [
  {
    id: "trial",
    name: "Trial",
    priceZar: 0,
    period: "7 days",
    tagline: "Full MVP features, 10 leads max",
    features: [
      "1 website",
      "10 leads per trial",
      "AI lead qualification",
      "WhatsApp notifications",
      "Dashboard access",
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    id: "starter",
    name: "Starter",
    priceZar: 4999,
    period: "month",
    tagline: "For solopreneurs & small firms",
    features: [
      "1 website",
      "100 leads / month",
      "AI lead qualification",
      "WhatsApp notifications",
      "Lead dashboard + pipeline",
      "POPIA-compliant forms",
    ],
    cta: "Choose Starter",
    highlight: true,
  },
  {
    id: "growth",
    name: "Growth",
    priceZar: 9999,
    period: "month",
    tagline: "For growing firms (5-20 staff)",
    features: [
      "3 websites",
      "Unlimited leads",
      "AI chatbot on website",
      "Email daily summaries",
      "Custom domain",
      "Analytics dashboard",
    ],
    cta: "Choose Growth",
    highlight: false,
  },
  {
    id: "agency",
    name: "Agency",
    priceZar: 24999,
    period: "month",
    tagline: "For agencies managing clients",
    features: [
      "10 websites",
      "White-label branding",
      "API access",
      "Priority support",
      "Multi-seat dashboard",
    ],
    cta: "Talk to Sales",
    highlight: false,
  },
] as const;

export const LEAD_STATUSES = [
  { value: "new", label: "New", color: "bg-sky-100 text-sky-700 border-sky-200" },
  { value: "contacted", label: "Contacted", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "qualified", label: "Qualified", color: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "won", label: "Won", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "lost", label: "Lost", color: "bg-rose-100 text-rose-700 border-rose-200" },
] as const;

export const AI_TEMPERATURES = [
  { value: "hot", label: "Hot", color: "bg-red-100 text-red-700 border-red-200", emoji: "🔥", minScore: 8 },
  { value: "warm", label: "Warm", color: "bg-amber-100 text-amber-700 border-amber-200", emoji: "⚡", minScore: 5 },
  { value: "cold", label: "Cold", color: "bg-sky-100 text-sky-700 border-sky-200", emoji: "❄️", minScore: 0 },
] as const;

export const PRIMARY_COLOR_DEFAULT = "#059669";

export const INDUSTRY_PRESETS: Record<string, { color: string; emoji: string }> = {
  legal: { color: "#0f766e", emoji: "⚖️" },
  consulting: { color: "#059669", emoji: "💼" },
  hr: { color: "#0891b2", emoji: "🤝" },
  coaching: { color: "#db2777", emoji: "🎯" },
  wellness: { color: "#9333ea", emoji: "🌿" },
  accounting: { color: "#0d9488", emoji: "📊" },
  construction: { color: "#ea580c", emoji: "🏗️" },
  insurance: { color: "#0369a1", emoji: "🛡️" },
  other: { color: "#059669", emoji: "✨" },
};

export function formatZar(cents: number): string {
  return "R" + (cents / 100).toLocaleString("en-ZA");
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString("en-ZA");
}
