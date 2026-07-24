"use client";

import * as React from "react";
import {
  Users,
  Download,
  RefreshCw,
  MessageCircle,
  CheckCircle2,
  Sparkles,
  Phone,
  Clock,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { apiClient, useAsync } from "@/lib/api-client";
import {
  LEAD_STATUSES,
  AI_TEMPERATURES,
  timeAgo,
} from "@/lib/constants";
import type { Lead } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------- helpers ----------
function statusMeta(value: string) {
  return LEAD_STATUSES.find((s) => s.value === value) ?? LEAD_STATUSES[0];
}
function tempMeta(value: string | null) {
  if (!value) return null;
  return AI_TEMPERATURES.find((t) => t.value === value) ?? null;
}
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?"
  );
}

function scoreColor(score: number | null) {
  if (score === null) return "bg-slate-100 text-slate-500";
  if (score >= 8) return "bg-red-100 text-red-700";
  if (score >= 5) return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
}
function avatarColor(temp: string | null) {
  if (temp === "hot") return "bg-red-100 text-red-700";
  if (temp === "warm") return "bg-amber-100 text-amber-700";
  if (temp === "cold") return "bg-sky-100 text-sky-700";
  return "bg-slate-100 text-slate-600";
}

function sanitizePhone(p: string) {
  // for wa.me — strip spaces, +, leading 0 → 27
  let s = p.replace(/[^\d]/g, "");
  if (s.startsWith("0")) s = "27" + s.slice(1);
  if (!s.startsWith("27") && s.length > 0) s = "27" + s;
  return s;
}

// ---------- CSV export ----------
function exportCsv(leads: Lead[]) {
  const headers = [
    "id",
    "name",
    "phone",
    "email",
    "serviceNeeded",
    "message",
    "aiScore",
    "aiTemperature",
    "status",
    "whatsappSent",
    "createdAt",
  ];
  const escape = (v: unknown) => {
    const s = (v ?? "").toString();
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = leads.map((l) =>
    [
      l.id,
      l.name,
      l.phone,
      l.email,
      l.serviceNeeded,
      l.message,
      l.aiScore ?? "",
      l.aiTemperature ?? "",
      l.status,
      l.whatsappSent ? "yes" : "no",
      new Date(l.createdAt).toISOString(),
    ]
      .map(escape)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${leads.length} lead${leads.length === 1 ? "" : "s"}`);
}

// ---------- Filter tabs ----------
type StatusFilter = "all" | "new" | "hot" | "won" | "lost";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "hot", label: "Hot" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

function FilterTabs({
  value,
  onChange,
  counts,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
      {STATUS_FILTERS.map((f) => {
        const active = value === f.value;
        return (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
              active
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {f.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600"
              )}
            >
              {counts[f.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Lead Card ----------
function LeadCard({
  lead,
  onStatusChange,
  onRequalify,
  requalifying,
}: {
  lead: Lead;
  onStatusChange: (status: Lead["status"]) => void;
  onRequalify: () => void;
  requalifying: boolean;
}) {
  const sm = statusMeta(lead.status);
  const tm = tempMeta(lead.aiTemperature);

  return (
    <Card className="overflow-hidden py-0 transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          {/* Left: avatar + name */}
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold",
                avatarColor(lead.aiTemperature)
              )}
            >
              {initials(lead.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {lead.name}
                </p>
                {lead.whatsappSent && (
                  <span
                    title="WhatsApp confirmation sent"
                    className="text-emerald-500"
                  >
                    <CheckCircle2 className="size-3.5" />
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-mono">
                  <Phone className="size-3" />
                  {lead.phone}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {timeAgo(lead.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: score + temperature */}
          <div className="flex shrink-0 items-center gap-2 md:flex-col md:items-end">
            {lead.aiScore !== null && (
              <div
                className={cn(
                  "flex items-baseline gap-0.5 rounded-md px-2 py-0.5",
                  scoreColor(lead.aiScore)
                )}
                title={`AI quality score: ${lead.aiScore}/10`}
              >
                <span className="text-lg font-bold tabular-nums leading-none">
                  {lead.aiScore}
                </span>
                <span className="text-[10px] font-medium opacity-70">/10</span>
              </div>
            )}
            {tm && (
              <Badge variant="outline" className={cn("text-[11px]", tm.color)}>
                <span>{tm.emoji}</span>
                {tm.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Middle: what they need */}
        {(lead.serviceNeeded || lead.message) && (
          <div className="mt-3 rounded-md bg-slate-50 p-2.5 text-sm">
            {lead.serviceNeeded && (
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                What they need
              </p>
            )}
            {lead.serviceNeeded && (
              <p className="mt-0.5 text-sm font-medium text-slate-800">
                {lead.serviceNeeded}
              </p>
            )}
            {lead.message && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                &ldquo;{lead.message}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* Bottom: actions */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <Select
            value={lead.status}
            onValueChange={(v) => onStatusChange(v as Lead["status"])}
          >
            <SelectTrigger
              size="sm"
              className={cn("h-8 w-[130px] border-slate-200 text-xs", sm.color)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={cn("size-2 rounded-full", s.color.split(" ")[0])}
                    />
                    {s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            onClick={onRequalify}
            disabled={requalifying}
            className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <RefreshCw className={cn("size-3.5", requalifying && "animate-spin")} />
            Re-qualify
          </Button>

          <Button
            size="sm"
            variant="ghost"
            asChild
            className="h-8 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <a
              href={`https://wa.me/${sanitizePhone(lead.phone)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="size-3.5" />
              WhatsApp
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadCardSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-12 rounded-md" />
        </div>
        <Skeleton className="mt-3 h-16 w-full rounded-md" />
        <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Main ----------
export function LeadsTab() {
  const { data, loading, reload, setData } = useAsync(
    () => apiClient.listLeads(),
    []
  );

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [tempFilter, setTempFilter] = React.useState<string>("all");
  const [requalifyingId, setRequalifyingId] = React.useState<string | null>(null);

  const leads = data?.leads ?? [];

  // counts per status filter
  const counts = React.useMemo<Record<StatusFilter, number>>(() => {
    return {
      all: leads.length,
      new: leads.filter((l) => l.status === "new").length,
      hot: leads.filter((l) => l.aiTemperature === "hot").length,
      won: leads.filter((l) => l.status === "won").length,
      lost: leads.filter((l) => l.status === "lost").length,
    };
  }, [leads]);

  // apply filters + sort
  const filtered = React.useMemo(() => {
    let arr = [...leads];
    if (statusFilter === "hot") {
      arr = arr.filter((l) => l.aiTemperature === "hot");
    } else if (statusFilter !== "all") {
      arr = arr.filter((l) => l.status === statusFilter);
    }
    if (tempFilter !== "all") {
      arr = arr.filter((l) => l.aiTemperature === tempFilter);
    }
    arr.sort((a, b) => {
      const sa = a.aiScore ?? 0;
      const sb = b.aiScore ?? 0;
      if (sb !== sa) return sb - sa;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
    return arr;
  }, [leads, statusFilter, tempFilter]);

  async function handleStatusChange(lead: Lead, status: Lead["status"]) {
    // optimistic
    if (setData) {
      setData({
        ...data!,
        leads: data!.leads.map((l) =>
          l.id === lead.id ? { ...l, status } : l
        ),
      });
    }
    try {
      await apiClient.updateLeadStatus(lead.id, status);
      toast.success(`Marked as ${statusMeta(status).label.toLowerCase()}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
      // revert
      if (setData) setData(data!);
    }
  }

  async function handleRequalify(lead: Lead) {
    setRequalifyingId(lead.id);
    try {
      const res = await apiClient.reQualify(lead.id);
      if (setData && data) {
        setData({
          ...data,
          leads: data.leads.map((l) =>
            l.id === lead.id
              ? {
                  ...l,
                  aiScore: res.lead.aiScore,
                  aiTemperature: res.lead.aiTemperature,
                  aiReason: res.lead.aiReason,
                }
              : l
          ),
        });
      }
      toast.success(
        `Re-qualified: ${res.lead.aiTemperature ?? "—"} · ${res.lead.aiScore ?? 0}/10`
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Re-qualification failed");
    } finally {
      setRequalifyingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-900">
            Leads
            <Badge
              variant="secondary"
              className="bg-emerald-50 text-emerald-700"
            >
              {leads.length}
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage and qualify every enquiry in one place.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => exportCsv(leads)}
          disabled={leads.length === 0}
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          value={statusFilter}
          onChange={setStatusFilter}
          counts={counts}
        />
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={tempFilter} onValueChange={setTempFilter}>
            <SelectTrigger size="sm" className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Temperature" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All temperatures
              </SelectItem>
              {AI_TEMPERATURES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">
                  <span className="inline-flex items-center gap-2">
                    <span>{t.emoji}</span>
                    {t.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <LeadCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Users className="size-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                No leads match this filter
              </p>
              <p className="text-xs text-muted-foreground">
                Try changing the filter or wait for new leads to arrive.
              </p>
            </div>
            {(statusFilter !== "all" || tempFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setTempFilter("all");
                }}
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            "grid gap-3 md:grid-cols-2",
            "max-h-[70vh] overflow-y-auto pr-1",
            // custom scrollbar (Tailwind arbitrary properties)
            "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb:hover]:bg-slate-400"
          )}
        >
          {filtered.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onStatusChange={(s) => handleStatusChange(lead, s)}
              onRequalify={() => handleRequalify(lead)}
              requalifying={requalifyingId === lead.id}
            />
          ))}
          {filtered.length > 0 && (
            <div className="col-span-full flex items-center justify-center py-2 text-xs text-muted-foreground">
              <Sparkles className="mr-1 size-3 text-emerald-500" />
              Showing {filtered.length} of {leads.length} leads · sorted by AI
              score
              <button
                onClick={reload}
                className="ml-2 inline-flex items-center gap-1 text-emerald-600 hover:underline"
              >
                <RefreshCw className="size-3" />
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
