"use client";

import { motion } from "framer-motion";
import { Check, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/constants";
import Link from "next/link";

export default function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Simple pricing in Rand. Cancel anytime.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Start with a 7-day free trial. No credit card required. Upgrade when
            you’re ready.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => {
            const isTrial = plan.id === "trial";
            const priceDisplay = isTrial
              ? "R0"
              : `R${plan.priceZar.toLocaleString("en-ZA")}`;
            const periodSuffix = isTrial ? "" : "/mo";

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className={plan.highlight ? "lg:-mt-3" : ""}
              >
                <Card
                  className={`relative h-full transition-shadow hover:shadow-md ${
                    plan.highlight
                      ? "border-emerald-300 shadow-lg ring-1 ring-emerald-200"
                      : "border-slate-200"
                  }`}
                >
                  {plan.highlight && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1 bg-emerald-600 px-3 text-white shadow-sm">
                      <Star className="size-3 fill-white" />
                      Most Popular
                    </Badge>
                  )}

                  <CardContent className="flex h-full flex-col items-start gap-5">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {plan.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {plan.tagline}
                      </p>
                    </div>

                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                        {priceDisplay}
                      </span>
                      <span className="pb-1 text-sm text-slate-500">
                        {periodSuffix}
                      </span>
                    </div>

                    <Button
                      className={`w-full ${
                        plan.highlight
                          ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}
                      variant={plan.highlight ? "default" : "outline"}
                      asChild
                    >
                      <Link href="/signup">
                        {plan.cta}
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>

                    <ul className="flex w-full flex-col gap-2.5 border-t border-slate-100 pt-4">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-sm text-slate-700"
                        >
                          <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                          {f}
                        </li>
                      ))}
                    </ul>
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
