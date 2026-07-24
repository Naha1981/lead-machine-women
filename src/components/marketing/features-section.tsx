"use client";

import { motion } from "framer-motion";
import {
  Wand2,
  Zap,
  Sparkles,
  MessageCircle,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Wand2,
    title: "AI Website Generation",
    description:
      "Describe your business and get a polished, mobile-first website with copy, services, and FAQ in under 60 seconds.",
  },
  {
    icon: Zap,
    title: "Instant Lead Capture",
    description:
      "Every form enquiry is captured instantly — no lost emails, no missed DMs, no leads falling through the cracks.",
  },
  {
    icon: Sparkles,
    title: "AI Lead Qualification",
    description:
      "Scores every lead 1-10 as Hot, Warm, or Cold based on intent, urgency, and fit — so you know who to call first.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Notifications",
    description:
      "You and the prospect both get a WhatsApp message within 10 seconds. Be first to reply, every single time.",
  },
  {
    icon: LayoutDashboard,
    title: "Lead Dashboard",
    description:
      "Pipeline view, status tracking, conversion metrics. Everything you need to run your sales funnel in one place.",
  },
  {
    icon: ShieldCheck,
    title: "POPIA Compliant",
    description:
      "Consent capture built into every form. Full audit trail. We never share your data — your leads stay yours.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 bg-slate-50 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Everything you need
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            A full lead machine — not just a website
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            From first click to closed deal, Lead Machine handles every step so
            you can focus on serving clients.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.1 }}
              >
                <Card className="h-full border-slate-200 transition-shadow hover:shadow-md">
                  <CardContent className="flex h-full flex-col items-start gap-4">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Icon className="size-6" />
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {f.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {f.description}
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
