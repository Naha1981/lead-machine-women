"use client";

import * as React from "react";
import {
  Users,
  CalendarDays,
  CalendarRange,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  MessageCircle,
  Inbox,
  Sparkles,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

import { cn } from "@/lib/utils";
import { apiClient, useAsync } from "@/lib/api-client";
import {
  LEAD_STATUSES,
  AI_TEMPERATURES,
  timeAgo,
} from "@/lib/constants";
import { useAppStore } from "@/store/app-store";
import type { Lead, WhatsAppMessage } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ---------- helpers ----------
function statusMeta(value: string) {
  return LEAD_STATUSES.find((s) => s.value === value) ?? LEAD_STATUSES[0];
}
function tempMeta(value: string | null) {
  if (!value) return null;
  return AI_TEMPERATURES.find((t) => t.value === value) ?? null;
}
function tempEmoji(value: string | null) {
  return tempMeta(value)?.emoji ?? "•";
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = (r.getDay() + 6) % 7; // Monday = 0
  r.setDate(r.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}
function startOfMonth(d: Date) {
  const r = new Date(d);
  r.setDate(1);
  r.setHours(0, 0, 0, 0);
  return r;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";
}

// ---------- Stat Card ----------
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  accent: string;
}) {
  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900 md:text-3xl">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-xs font-medium",
                trendUp ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              {trendUp ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {trend}
            </p>
          )}
        </div>
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-lg",
            accent
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="size-10 rounded-lg" />
      </CardContent>
    </Card>
  );
}

// ---------- Funnel ----------
function Funnel({ leads }: { leads: Lead[] }) {
  const steps = [
    { key: "new", label: "New", color: "bg-sky-500" },
    { key: "contacted", label: "Contacted", color: "bg-amber-500" },
    { key: "qualified", label: "Qualified", color: "bg-violet-500" },
    { key: "won", label: "Won", color: "bg-emerald-500" },
  ];
  const counts = steps.map((s) => ({
    ...s,
    count: leads.filter((l) => l.status === s.key).length,
  }));
  const max = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div className="space-y-3">
      {counts.map((c) => (
        <div key={c.key} className="flex items-center gap-3">
          <div className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
            {c.label}
          </div>
          <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted">
            <div
              className={cn("h-full rounded-md transition-all", c.color)}
              style={{ width: `${(c.count / max) * 100}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-end px-2 text-xs font-semibold text-slate-700">
              {c.count}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Recent Leads ----------
function RecentLeads({ leads }: { leads: Lead[] }) {
  const recent = [...leads]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <Inbox className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No leads yet.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {recent.map((l) => {
        const sm = statusMeta(l.status);
        return (
          <li
            key={l.id}
            className="flex items-center gap-3 py-2.5 transition-colors hover:bg-accent/40"
          >
            <div
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold",
                l.aiTemperature === "hot"
                  ? "bg-red-100 text-red-700"
                  : l.aiTemperature === "warm"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-sky-100 text-sky-700"
              )}
            >
              {initials(l.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {l.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {l.serviceNeeded || l.message?.slice(0, 40) || "—"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className="text-base leading-none"
                aria-label={`Temperature: ${l.aiTemperature ?? "unknown"}`}
                title={`Score ${l.aiScore ?? 0}/10 · ${l.aiTemperature ?? "—"}`}
              >
                {tempEmoji(l.aiTemperature)}
              </span>
              {l.aiScore !== null && (
                <span className="text-xs font-semibold tabular-nums text-slate-500">
                  {l.aiScore}/10
                </span>
              )}
              <Badge variant="outline" className={cn("text-[10px]", sm.color)}>
                {sm.label}
              </Badge>
              <span className="hidden text-[10px] text-muted-foreground sm:inline">
                {timeAgo(l.createdAt)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- WhatsApp Activity ----------
function WhatsAppActivity({ messages }: { messages: WhatsAppMessage[] }) {
  const recent = [...messages]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <MessageCircle className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No WhatsApp messages yet.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {recent.map((m) => {
        const outbound = m.direction === "outbound";
        return (
          <li key={m.id} className="flex items-start gap-3 py-2.5">
            <div
              className={cn(
                "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                outbound
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-sky-100 text-sky-700"
              )}
            >
              {outbound ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium text-slate-700">
                  {m.phoneNumber}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {timeAgo(m.createdAt)}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {m.content}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- Empty state ----------
function EmptyOverview() {
  const org = useAppStore((s) => s.org);
  const openPublicSite = useAppStore((s) => s.openPublicSite);

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <Sparkles className="size-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">
            No leads yet
          </h3>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Share your website link to start getting leads. Every enquiry is
            auto-qualified by AI and pinged to your WhatsApp.
          </p>
        </div>
        <Button
          onClick={() => org && openPublicSite(org.slug)}
          disabled={!org}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <ExternalLink />
          Preview my website
        </Button>
      </CardContent>
    </Card>
  );
}

// need import (used in EmptyOverview)
// (ExternalLink imported at top)

// ---------- Main ----------
export function OverviewTab() {
  const org = useAppStore((s) => s.org);
  const { data: leadsData, loading: leadsLoading } = useAsync(
    () => apiClient.listLeads(),
    []
  );
  const { data: waData, loading: waLoading } = useAsync(
    () => apiClient.getWhatsappMessages(),
    []
  );

  const leads = leadsData?.leads ?? [];
  const messages = waData?.messages ?? [];

  // ----- stats -----
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const total = leads.length;
  const thisWeek = leads.filter((l) => new Date(l.createdAt) >= weekStart).length;
  const thisMonth = leads.filter((l) => new Date(l.createdAt) >= monthStart).length;
  const hot = leads.filter((l) => l.aiTemperature === "hot").length;
  const won = leads.filter((l) => l.status === "won").length;
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

  // ----- bar chart: last 7 days -----
  const chartData = React.useMemo(() => {
    const days: { label: string; count: number; date: Date }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString("en-ZA", { weekday: "short" }),
        count: 0,
        date: d,
      });
    }
    for (const l of leads) {
      const d = new Date(l.createdAt);
      d.setHours(0, 0, 0, 0);
      const found = days.find((x) => x.date.getTime() === d.getTime());
      if (found) found.count += 1;
    }
    return days;
  }, [leads]);

  if (leadsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
              <Skeleton className="h-7 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return <EmptyOverview />;
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Overview
        </h2>
        <p className="text-sm text-muted-foreground">
          {org?.name ? `${org.name} · ` : ""}AI-powered lead intelligence at a glance.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Leads"
          value={total}
          trend={`${winRate}% win rate`}
          trendUp={winRate > 0}
          accent="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          icon={CalendarDays}
          label="This Week"
          value={thisWeek}
          trend={thisWeek > 0 ? "Active week" : "Slow week"}
          trendUp={thisWeek > 0}
          accent="bg-teal-100 text-teal-700"
        />
        <StatCard
          icon={CalendarRange}
          label="This Month"
          value={thisMonth}
          trend={`${hot} hot leads`}
          trendUp={hot > 0}
          accent="bg-sky-100 text-sky-700"
        />
        <StatCard
          icon={Flame}
          label="Hot Leads"
          value={hot}
          trend="Needs follow-up"
          trendUp={hot > 0}
          accent="bg-red-100 text-red-700"
        />
      </div>

      {/* Chart + funnel */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4 text-emerald-600" />
                  Leads per day
                </CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Last 7 days
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                {chartData.reduce((a, b) => a + b.count, 0)} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(16,185,129,0.08)" }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {chartData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.count > 0
                            ? "#10b981"
                            : "#e2e8f0"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion funnel</CardTitle>
            <CardDescription className="text-xs">
              Leads by pipeline stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Funnel leads={leads} />
          </CardContent>
        </Card>
      </div>

      {/* Recent + WhatsApp */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Inbox className="size-4 text-emerald-600" />
                Recent Leads
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Last {Math.min(5, leads.length)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <RecentLeads leads={leads} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4 text-emerald-600" />
                WhatsApp Activity
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {messages.length} message{messages.length === 1 ? "" : "s"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {waLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <WhatsAppActivity messages={messages} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
