"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CtaSection() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-16 text-center shadow-xl sm:px-16"
        >
          {/* Decorative grid */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]"
          />
          <div
            aria-hidden
            className="absolute -top-20 -right-20 size-72 rounded-full bg-white/10 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-24 -left-20 size-72 rounded-full bg-teal-300/20 blur-3xl"
          />

          <div className="relative">
            <h2 className="mx-auto max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Turn visitors into paying clients while you sleep.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-emerald-50 sm:text-lg">
              Start your 7-day free trial. No credit card. Cancel anytime. Your
              first lead could be tomorrow.
            </p>
            <Button
              size="lg"
              asChild
              className="mt-8 bg-white text-emerald-700 shadow-lg hover:bg-emerald-50"
            >
              <Link href="/signup">
                Start Your 7-Day Free Trial
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
