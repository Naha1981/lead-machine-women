// Lead Machine — shared types

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
};

export type Org = {
  id: string;
  name: string;
  slug: string;
  industry: string;
  services: string | null;
  logoUrl: string | null;
  primaryColor: string;
  whatsappNumber: string | null;
  whatsappConnected: boolean;
  ownerPhone: string | null;
  plan: string;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Lead = {
  id: string;
  orgId: string;
  name: string;
  phone: string;
  email: string | null;
  serviceNeeded: string | null;
  message: string | null;
  source: string;
  aiScore: number | null;
  aiTemperature: "hot" | "warm" | "cold" | null;
  aiReason: string | null;
  status: "new" | "contacted" | "qualified" | "won" | "lost";
  whatsappSent: boolean;
  ownerNotified: boolean;
  consentGiven: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteService = { name: string; description: string };
export type WebsiteFaq = { question: string; answer: string };

export type Website = {
  id: string;
  orgId: string;
  template: string;
  heroHeadline: string | null;
  heroSubtext: string | null;
  aboutText: string | null;
  services: WebsiteService[];
  faq: WebsiteFaq[];
  ctaText: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WhatsAppMessage = {
  id: string;
  orgId: string;
  leadId: string | null;
  direction: "inbound" | "outbound";
  phoneNumber: string;
  content: string;
  messageType: string;
  status: string;
  createdAt: string;
};

export type Subscription = {
  id: string;
  orgId: string;
  plan: string;
  amountZar: number;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  createdAt: string;
};

export type AppView = "landing" | "auth" | "onboarding" | "dashboard" | "public";
export type DashboardTab = "overview" | "leads" | "website" | "settings" | "billing";
