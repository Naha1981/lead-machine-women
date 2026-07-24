"use client";

import { useState } from "react";
import { Zap, Menu, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useAppStore } from "@/store/app-store";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export default function LandingHeader() {
  const navigate = useAppStore((s) => s.navigate);
  const [open, setOpen] = useState(false);

  const handleStart = () => {
    setOpen(false);
    navigate("auth");
  };

  const handleSignIn = () => {
    setOpen(false);
    navigate("auth");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-100/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="#top" className="flex items-center gap-2" aria-label="Lead Machine home">
          <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <Zap className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Lead Machine
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-700"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="ghost"
            onClick={handleSignIn}
            className="text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
          >
            Sign In
          </Button>
          <Button
            onClick={handleStart}
            className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
          >
            Start Free Trial
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation menu"
                className="text-slate-700 hover:bg-emerald-50"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-md bg-emerald-600 text-white">
                    <Zap className="size-4" />
                  </span>
                  Lead Machine
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                {NAV_LINKS.map((l) => (
                  <SheetClose asChild key={l.href}>
                    <a
                      href={l.href}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      {l.label}
                    </a>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 p-4">
                <Button
                  variant="outline"
                  onClick={handleSignIn}
                  className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  Sign In
                </Button>
                <Button
                  onClick={handleStart}
                  className="w-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                >
                  Start Free Trial
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
