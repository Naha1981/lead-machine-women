"use client";

import * as React from "react";
import { ArrowRight, CheckCircle2, MessageCircle, ShieldCheck } from "lucide-react";
import { LeadForm } from "@/components/lead/lead-form";
import type { PublicOrg, PublicWebsite } from "@/components/views/public-site-view";

export function StandaloneLeadMachine({
  org,
  website,
}: {
  org: PublicOrg;
  website: PublicWebsite;
}) {
  const brand = org.primaryColor || "#059669";
  const headline = website.heroHeadline || `Talk to ${org.name}`;
  const subtext =
    website.heroSubtext ||
    `Tell ${org.name} what you need and their team can follow up directly.`;
  const services = website.services?.slice(0, 4) ?? [];
  const whatsapp = org.whatsappNumber
    ? org.whatsappNumber.replace(/[^0-9]/g, "").replace(/^0/, "27")
    : "";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(55% 70% at 75% 20%, ${brand}40 0%, transparent 65%), radial-gradient(45% 50% at 10% 80%, ${brand}26 0%, transparent 60%)`,
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Lead Machine
              </p>
              <h1 className="mt-2 text-xl font-semibold">{org.name}</h1>
            </div>
            <span
              className="rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: `${brand}66`, color: brand }}
            >
              Direct enquiry channel
            </span>
          </div>

          <div className="grid gap-10 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <h2 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
                {headline}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">{subtext}</p>

              <div className="mt-7 flex flex-wrap gap-3">
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white shadow-sm"
                    style={{ backgroundColor: brand }}
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp {org.name}
                  </a>
                )}
                <a
                  href="#enquire"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white"
                >
                  Make an enquiry
                  <ArrowRight className="size-4" />
                </a>
              </div>

              <div className="mt-7 flex flex-wrap gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-400" />
                  POPIA-aware enquiry handling
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  Direct to the business team
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Why people enquire
              </p>
              <div className="mt-4 space-y-3">
                {services.length ? (
                  services.map((service) => (
                    <div key={service.name} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                      <p className="font-semibold">{service.name}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{service.description}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-slate-300">
                    Tell the team what you need and they will guide you to the right next step.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="enquire" className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
        <div className="lg:pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: brand }}>
            One simple next step
          </p>
          <h3 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Tell {org.name} what you need.
          </h3>
          <p className="mt-4 text-slate-400">
            Your enquiry goes through the same Lead Machine pipeline: capture, qualify, follow up and notify the business.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
          <LeadForm
            slug={org.slug}
            businessName={org.name}
            ctaText={website.ctaText || "Send my enquiry"}
            source="standalone"
          />
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-slate-500">
        Powered by Lead Machine by NahaLabs
      </footer>
    </main>
  );
}
