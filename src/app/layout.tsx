import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lead Machine — AI Lead Generation for South African SMEs",
  description:
    "Get 10+ qualified leads per month on autopilot. Your business gets a professional website + AI that captures, qualifies, and WhatsApp-notifies you in 10 seconds.",
  keywords: [
    "lead generation",
    "South Africa SME",
    "AI website",
    "WhatsApp leads",
    "CRM",
    "NahaLabs",
  ],
  authors: [{ name: "NahaLabs" }],
  openGraph: {
    title: "Lead Machine — AI Lead Generation",
    description: "Your business gets a website that turns visitors into paying clients while you sleep.",
    siteName: "Lead Machine",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#059669",
          colorBackground: "#ffffff",
          borderRadius: "0.625rem",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        },
        elements: {
          formButtonPrimary:
            "bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium",
          card: "bg-white border border-slate-200 shadow-lg",
          headerTitle: "text-slate-900",
          headerSubtitle: "text-slate-600",
          socialButtonsBlockButton:
            "border border-slate-200 text-slate-700 hover:bg-slate-50",
          socialButtonsBlockButtonText: "text-slate-700",
          dividerLine: "bg-slate-200",
          dividerText: "text-slate-400",
          formFieldLabel: "text-slate-700",
          formFieldInput:
            "border border-slate-200 text-slate-900 placeholder:text-slate-400",
          footerActionLink: "text-emerald-600 hover:text-emerald-700",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        >
          {children}
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
        </body>
      </html>
    </ClerkProvider>
  );
}
