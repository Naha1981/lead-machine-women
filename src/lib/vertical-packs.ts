// Lead Machine — vertical intelligence packs for one-click client onboarding.
// These are product logic: each pack supplies starter services, qualification
// questions, urgency cues, and deterministic fallback scoring.

export type VerticalQualificationQuestion = {
  id: string;
  label: string;
  prompt: string;
  required?: boolean;
};

export type VerticalPack = {
  id: string;
  industry: string;
  label: string;
  emoji: string;
  template: string;
  services: string[];
  qualificationQuestions: VerticalQualificationQuestion[];
  urgentKeywords: string[];
  fitKeywords: string[];
};

export const VERTICAL_PACKS: Record<string, VerticalPack> = {
  plumber: {
    id: "plumber",
    industry: "plumber",
    label: "Plumber",
    emoji: "🔧",
    template: "construction",
    services: [
      "Emergency plumbing",
      "Leak detection and repair",
      "Blocked drains",
      "Geyser repairs and installation",
      "Bathroom and kitchen plumbing",
    ],
    qualificationQuestions: [
      { id: "location", label: "Location", prompt: "Where is the property?", required: true },
      { id: "problem", label: "Problem", prompt: "What plumbing problem needs attention?", required: true },
      { id: "urgency", label: "Urgency", prompt: "Is this an emergency or can it wait?", required: true },
      { id: "photos", label: "Photos", prompt: "Can the customer send a photo or short video?" },
      { id: "property", label: "Property type", prompt: "Is it a house, apartment, office or other property?" },
    ],
    urgentKeywords: ["burst", "flood", "flooding", "overflow", "no water", "emergency", "leaking now", "urgent"],
    fitKeywords: ["plumb", "leak", "geyser", "drain", "pipe", "toilet", "tap"],
  },
  electrician: {
    id: "electrician",
    industry: "electrician",
    label: "Electrician",
    emoji: "⚡",
    template: "construction",
    services: [
      "Electrical fault finding",
      "Electrical installations",
      "DB board repairs and upgrades",
      "Compliance certificates",
      "Solar and inverter electrical work",
    ],
    qualificationQuestions: [
      { id: "location", label: "Location", prompt: "Where is the property?", required: true },
      { id: "fault", label: "Fault or job", prompt: "What electrical fault or installation is needed?", required: true },
      { id: "urgency", label: "Urgency", prompt: "Is the issue urgent or planned work?", required: true },
      { id: "power", label: "Power status", prompt: "Is there a current power or safety issue?" },
      { id: "compliance", label: "Compliance", prompt: "Is a COC or other compliance document required?" },
    ],
    urgentKeywords: ["sparking", "smoke", "fire", "power out", "short circuit", "danger", "emergency", "urgent"],
    fitKeywords: ["electric", "power", "db board", "coc", "solar", "inverter", "wiring", "plug", "lights"],
  },
  "mobile-mechanic": {
    id: "mobile-mechanic",
    industry: "mobile-mechanic",
    label: "Mobile Mechanic",
    emoji: "🚗",
    template: "construction",
    services: [
      "Mobile diagnostics",
      "Breakdown assistance",
      "Battery and starting faults",
      "Brake and service repairs",
      "Pre-purchase vehicle inspections",
    ],
    qualificationQuestions: [
      { id: "location", label: "Location", prompt: "Where is the vehicle now?", required: true },
      { id: "vehicle", label: "Vehicle", prompt: "What make, model and year is the vehicle?", required: true },
      { id: "problem", label: "Problem", prompt: "What is the vehicle doing or not doing?", required: true },
      { id: "drivable", label: "Drivable", prompt: "Can the vehicle still be driven safely?" },
      { id: "timing", label: "Timing", prompt: "When does the customer need help?" },
    ],
    urgentKeywords: ["breakdown", "stranded", "won't start", "doesn't start", "immobile", "accident", "emergency", "urgent"],
    fitKeywords: ["car", "vehicle", "mechanic", "battery", "brake", "engine", "service", "diagnostic"],
  },
  cleaner: {
    id: "cleaner",
    industry: "cleaner",
    label: "Cleaner",
    emoji: "🧹",
    template: "professional",
    services: [
      "Home cleaning",
      "Office cleaning",
      "Deep cleaning",
      "Move-in and move-out cleaning",
      "Post-construction cleaning",
    ],
    qualificationQuestions: [
      { id: "location", label: "Location", prompt: "Where is the property?", required: true },
      { id: "property", label: "Property", prompt: "What type and size of property needs cleaning?", required: true },
      { id: "service", label: "Cleaning service", prompt: "What type of cleaning is required?", required: true },
      { id: "timing", label: "Timing", prompt: "When does the customer need the cleaning?" },
      { id: "frequency", label: "Frequency", prompt: "Is this a once-off clean or recurring service?" },
    ],
    urgentKeywords: ["today", "tomorrow", "same day", "urgent", "move out", "move-in", "inspection"],
    fitKeywords: ["clean", "house", "office", "deep clean", "moving", "post-construction"],
  },
};

export function getVerticalPack(industry: string | null | undefined): VerticalPack | null {
  if (!industry) return null;
  return VERTICAL_PACKS[industry] ?? null;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase();
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export function fallbackLeadQualification(opts: {
  industry: string;
  serviceNeeded?: string;
  message?: string;
  phone?: string;
}): {
  score: number;
  temperature: "hot" | "warm" | "cold";
  reason: string;
  suggestedAction: string;
} {
  const pack = getVerticalPack(opts.industry);
  const text = (opts.serviceNeeded ?? "") + " " + (opts.message ?? "");
  let score = 4;

  if (pack && containsAny(text, pack.fitKeywords)) score += 2;
  if (pack && containsAny(text, pack.urgentKeywords)) score += 2;
  if ((opts.message ?? "").trim().length >= 30) score += 1;
  if ((opts.phone ?? "").replace(/\D/g, "").length >= 9) score += 1;

  score = Math.max(1, Math.min(10, score));
  const temperature = score >= 8 ? "hot" : score >= 5 ? "warm" : "cold";
  const suggestedAction = temperature === "hot" ? "Contact this lead now" : temperature === "warm" ? "Follow up promptly" : "Review before prioritising";
  const urgency = pack && containsAny(text, pack.urgentKeywords) ? "Urgent signals were detected." : "No strong urgency signal was detected.";
  const fit = pack && containsAny(text, pack.fitKeywords) ? "The enquiry matches " + pack.label.toLowerCase() + " services." : "Service fit is still unclear.";

  return {
    score,
    temperature,
    reason: fit + " " + urgency,
    suggestedAction,
  };
}
