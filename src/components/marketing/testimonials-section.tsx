"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const TESTIMONIALS = [
  {
    initials: "NM",
    name: "Nonkosi M.",
    role: "Attorney · MVR Law",
    color: "bg-emerald-600",
    quote:
      "I want enquiries to come in and someone to respond immediately. With Lead Machine, the AI qualifies and WhatsApps me before the client even closes the form.",
  },
  {
    initials: "RZ",
    name: "Ruth Z.",
    role: "Coach · ShePowHer",
    color: "bg-teal-600",
    quote:
      "An AI that answers common questions and books people into my calendar — without me lifting a finger. It’s like having a 24/7 receptionist who never sleeps.",
  },
  {
    initials: "SK",
    name: "Sandi K.",
    role: "QS Director · Azzaro QS",
    color: "bg-emerald-700",
    quote:
      "A website that positions me as the go-to QS firm and captures tender enquiries. We’ve landed two new projects in our first month — pure ROI.",
  },
];

export default function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="scroll-mt-20 bg-slate-50 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Loved by SA founders
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Real businesses. Real leads. Real revenue.
          </h2>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card className="h-full border-slate-200">
                <CardContent className="flex h-full flex-col items-start gap-5">
                  <Quote className="size-8 text-emerald-200" />
                  <p className="flex-1 text-base leading-relaxed text-slate-700">
                    “{t.quote}”
                  </p>
                  <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                    <span
                      className={`flex size-10 items-center justify-center rounded-full text-sm font-bold text-white ${t.color}`}
                      aria-hidden
                    >
                      {t.initials}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {t.name}
                      </p>
                      <p className="text-xs text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
