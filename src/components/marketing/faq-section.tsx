"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "How fast will I get leads?",
    a: "Most clients see their first lead within 48 hours of publishing.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No. AI generates your website from your business profile in under 60 seconds.",
  },
  {
    q: "How does the AI qualify leads?",
    a: "Every lead is scored 1-10 and labelled hot, warm, or cold based on intent, urgency, and fit — so you know who to call first.",
  },
  {
    q: "Is it POPIA compliant?",
    a: "Yes. Every form includes a consent checkbox and we never share your data.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your dashboard with one click. No penalty.",
  },
  {
    q: "What if I already have a website?",
    a: "You can embed just the lead form and AI chat widget on your existing site.",
  },
];

export default function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            FAQ
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Questions, answered
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-10"
        >
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem
                key={f.q}
                value={`item-${i}`}
                className="border-slate-200"
              >
                <AccordionTrigger
                  id={`faq-trigger-${i}`}
                  aria-controls={`faq-content-${i}`}
                  className="text-left text-base font-semibold text-slate-900 hover:text-emerald-700 hover:no-underline"
                >
                  {f.q}
                </AccordionTrigger>
                <AccordionContent
                  id={`faq-content-${i}`}
                  aria-labelledby={`faq-trigger-${i}`}
                  className="text-base leading-relaxed text-slate-600"
                >
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
