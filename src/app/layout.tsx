import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

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
    "NhahaLabs",
  ],
  authors: [{ name: "NhahaLabs" }],
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
