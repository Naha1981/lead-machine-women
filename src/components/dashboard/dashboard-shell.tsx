"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  Globe,
  Settings as SettingsIcon,
  CreditCard,
  Menu,
  ExternalLink,
  LogOut,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { apiClient } from "@/lib/api-client";
import { useClerk } from "@clerk/nextjs";
import { INDUSTRIES } from "@/lib/constants";
import type { DashboardTab } from "@/types";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV: { tab: DashboardTab; label: string; icon: React.ElementType }[] = [
  { tab: "overview", label: "Overview", icon: LayoutDashboard },
  { tab: "leads", label: "Leads", icon: Users },
  { tab: "website", label: "Website", icon: Globe },
  { tab: "settings", label: "Settings", icon: SettingsIcon },
  { tab: "billing", label: "Billing", icon: CreditCard },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-sm">
        <Sparkles className="size-4" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-white">Lead Machine</p>
        <p className="text-[10px] uppercase tracking-wider text-slate-400">
          AI lead-gen for SA SMEs
        </p>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const tab = useAppStore((s) => s.dashboardTab);
  const setTab = useAppStore((s) => s.setDashboardTab);

  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Dashboard navigation">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = tab === item.tab;
        return (
          <button
            key={item.tab}
            onClick={() => {
              setTab(item.tab);
              onNavigate?.();
            }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
              active
                ? "bg-emerald-500/15 text-emerald-300"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            {/* Left accent border for active item */}
            <span
              aria-hidden
              className={cn(
                "absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-emerald-400 transition-opacity",
                active ? "opacity-100" : "opacity-0"
              )}
            />
            <Icon
              className={cn(
                "size-4 shrink-0",
                active ? "text-emerald-300" : "text-slate-400 group-hover:text-white"
              )}
            />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const org = useAppStore((s) => s.org);
  return (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex h-16 items-center px-4">
        <BrandMark />
      </div>
      <Separator className="bg-slate-800" />
      <div className="flex-1 overflow-y-auto py-4">
        <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Menu
        </p>
        <NavLinks onNavigate={onNavigate} />
      </div>
      <Separator className="bg-slate-800" />
      <div className="p-4">
        <div className="rounded-lg bg-slate-800/60 p-3">
          <p className="text-xs font-medium text-slate-200">
            {org?.name ?? "Your business"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {org
              ? INDUSTRIES.find((i) => i.value === org.industry)?.label ??
                "Business"
              : "—"}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-emerald-400">
            Plan: {org?.plan ?? "trial"}
          </p>
        </div>
      </div>
    </div>
  );
}

function UserMenu() {
  const user = useAppStore((s) => s.user);
  const signOutLocal = useAppStore((s) => s.signOutLocal);
  const { signOut } = useClerk();

  const initials = (user?.name || user?.email || "U")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";

  async function handleSignOut() {
    try {
      await apiClient.signout();
    } catch {
      /* ignore network errors */
    }
    signOutLocal();
    // Clerk handles the actual sign-out client-side
    await signOut({ redirectUrl: "/" });
    toast.success("Signed out");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          aria-label="Open user menu"
        >
          <Avatar className="size-8 border border-emerald-200 bg-emerald-100">
            <AvatarFallback className="bg-emerald-100 text-emerald-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">
            {user?.name || user?.email}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-sm font-medium">{user?.name || "Account"}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-rose-600 focus:text-rose-700"
        >
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const org = useAppStore((s) => s.org);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const industryLabel = org
    ? INDUSTRIES.find((i) => i.value === org.industry)?.label ?? "Business"
    : "";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:px-6">
        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold text-slate-900 md:text-lg">
                {org?.name ?? "Dashboard"}
              </h1>
              {industryLabel && (
                <Badge
                  variant="secondary"
                  className="hidden bg-emerald-50 text-emerald-700 sm:inline-flex"
                >
                  {industryLabel}
                </Badge>
              )}
            </div>
            <p className="hidden text-xs text-slate-500 md:block">
              Welcome back — here&apos;s what&apos;s happening with your leads.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={!org}
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <a href={org ? `/s/${org.slug}` : "#"} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              <span className="hidden sm:inline">View my site</span>
              <span className="sm:hidden">Site</span>
            </a>
          </Button>
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <UserMenu />
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-60 shrink-0 lg:block">
          <SidebarBody />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </div>
          <footer className="mt-auto flex h-10 items-center justify-center border-t border-slate-200 bg-white px-4 text-xs text-slate-500">
            <span>
              © 2025 NhahaLabs ·{" "}
              <span className="font-medium text-emerald-700">POPIA Compliant</span>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
