"use client";

import { Zap } from "lucide-react";

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Demo", href: "#how-it-works" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "POPIA Notice", href: "#" },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2">
            <a
              href="#top"
              className="flex items-center gap-2"
              aria-label="Lead Machine home"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Zap className="size-5" />
              </span>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Lead Machine
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-600">
              AI-powered lead generation built for South African SMEs. Websites
              that work, leads that convert.
            </p>
            <p className="mt-3 text-xs text-slate-400">by NhahaLabs</p>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-slate-900">
                {col.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-slate-600 transition-colors hover:text-emerald-700"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            © 2026 NhahaLabs. Built in South Africa 🇿🇦
          </p>
          <p className="text-xs text-slate-400">
            Lead Machine · POPIA Compliant · WhatsApp-ready
          </p>
        </div>
      </div>
    </footer>
  );
}
