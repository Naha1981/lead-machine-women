"use client";

import { motion } from "framer-motion";
import { Building2, Wand2, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    n: 1,
    icon: Building2,
    title: "Tell us about your business",
    description:
      "Share your industry, services, and contact details. Takes 2 minutes — no briefs, no designers, no waiting.",
  },
  {
    n: 2,
    icon: Wand2,
    title: "AI builds your website",
    description:
      "Lead Machine generates a polished, mobile-first website with copy, services, and a lead form in under 60 seconds.",
  },
  {
    n: 3,
    icon: MessageCircle,
    title: "Leads flow in via WhatsApp",
    description:
      "Every enquiry is captured, AI-qualified, and pinged to your WhatsApp in 10 seconds — you and the prospect both.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            From zero to leads in three steps
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            No coding. No agencies. No waiting on designers. Just answer a few
            questions and you’re live.
          </p>
        </motion.div>

        <div className="relative mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Dashed connector line on desktop */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-10 hidden border-t-2 border-dashed border-emerald-200 md:block"
            style={{ marginLeft: "16.66%", marginRight: "16.66%" }}
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative"
              >
                <Card className="h-full border-emerald-100/80 shadow-sm">
                  <CardContent className="flex h-full flex-col items-start gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                        <Icon className="size-6" />
                      </span>
                      <span className="text-5xl font-black leading-none text-emerald-100">
                        {step.n}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
