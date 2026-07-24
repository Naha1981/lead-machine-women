"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Play,
  CheckCircle2,
  Phone,
  MessageCircle,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const TRUST_BADGES = [
  "No coding needed",
  "Live in 5 minutes",
  "R4,999/month — cancel anytime",
];

export default function HeroSection() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-white"
    >
      {/* Faint grid pattern */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(16,185,129,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.07)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]"
      />
      {/* Decorative blobs */}
      <div
        aria-hidden
        className="absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-emerald-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute top-40 -left-24 -z-10 size-72 rounded-full bg-teal-200/40 blur-3xl"
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:py-24">
        {/* Left: copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-start gap-6"
        >
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800"
          >
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Built for South African SMEs
          </Badge>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Get 10+ Qualified Leads Per Month.{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              On Autopilot.
            </span>
          </h1>

          <p className="max-w-xl text-lg text-slate-600">
            Your business gets a professional website + AI that captures,
            qualifies, and WhatsApp-notifies you in 10 seconds.
          </p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              size="lg"
              asChild
              className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
            >
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <a href="#how-it-works">
                <Play className="size-4" />
                Watch Demo
              </a>
            </Button>
          </div>

          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
            {TRUST_BADGES.map((b) => (
              <li
                key={b}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                {b}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Right: WhatsApp-style notification mockup */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
          className="relative"
        >
          <div className="relative mx-auto w-full max-w-sm">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 rounded-[2.5rem] bg-gradient-to-br from-emerald-400 to-teal-500 opacity-30 blur-2xl"
            />
            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl">
              {/* Mock status bar */}
              <div className="flex items-center justify-between px-2 pb-3 text-[10px] font-medium text-slate-400">
                <span>9:41</span>
                <span>Lead Machine</span>
                <span>•••</span>
              </div>

              {/* WhatsApp-style notification */}
              <Card className="gap-0 border-emerald-100 bg-emerald-50/60 py-0">
                <CardContent className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-9 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <MessageCircle className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          New Lead Alert
                        </p>
                        <p className="text-[11px] text-slate-500">
                          WhatsApp · just now
                        </p>
                      </div>
                    </div>
                    <Badge className="border-red-200 bg-red-100 text-red-700">
                      🔥 HOT
                    </Badge>
                  </div>

                  <div className="mt-3 rounded-lg bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">
                        Thabo M.
                      </p>
                      <p className="text-xs font-semibold text-emerald-700">
                        Score 9/10
                      </p>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      “Hi, I need a conveyancing attorney for a property
                      transfer in Sandton. Can you call me back today?”
                    </p>
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                      <Phone className="size-3" />
                      +27 82 555 0199
                      <span className="ml-auto flex items-center gap-1 text-emerald-600">
                        <Bell className="size-3" />
                        Notified in 10s
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mini stat tiles */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: "Today", value: "8" },
                  { label: "Hot", value: "3" },
                  { label: "Won", value: "2" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border border-slate-100 bg-white p-2 text-center"
                  >
                    <p className="text-lg font-bold text-emerald-700">
                      {s.value}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
