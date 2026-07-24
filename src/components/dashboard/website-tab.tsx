"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  Globe,
  ExternalLink,
  Copy,
  Loader2,
  Check,
  Eye,
  RefreshCw,
  Monitor,
  Smartphone,
  Lock,
  Pencil,
  ChevronRight,
  Zap,
  Palette,
  Share2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/app-store";
import { useAsync, apiClient } from "@/lib/api-client";
import { INDUSTRIES, INDUSTRY_PRESETS, TEMPLATES, timeAgo } from "@/lib/constants";
import type { Website, Org } from "@/types";

const INDUSTRY_EMOJI: Record<string, string> = {
  legal: "⚖️",
  consulting: "💼",
  hr: "🤝",
  coaching: "🎯",
  wellness: "🌿",
  accounting: "📊",
  construction: "🏗️",
  insurance: "🛡️",
  other: "✨",
};

export default function WebsiteTab() {
  const org = useAppStore((s) => s.org);

  const { data, loading, error, reload, setData } = useAsync(
    () => apiClient.getWebsite(),
    []
  );

  const website = data?.website ?? null;
  const websiteOrg = data?.org ?? null;
  const effectiveOrg = org ?? websiteOrg ?? null;

  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!effectiveOrg) {
      toast.error("Organization not loaded yet.");
      return;
    }
    setGenerating(true);
    try {
      const industryMeta = INDUSTRIES.find((i) => i.value === effectiveOrg.industry);
      const template = industryMeta?.template ?? "professional";
      const res = await apiClient.generateWebsite({
        businessName: effectiveOrg.name,
        industry: effectiveOrg.industry,
        services: effectiveOrg.services ?? "",
        template,
      });
      setData({ website: res.website } as any);
      toast.success("Website generated with AI! ✨");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to generate website.");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish(next: boolean) {
    setPublishing(true);
    try {
      await apiClient.publishWebsite(next);
      if (website) {
        setData({ website: { ...website, published: next } } as any);
      }
      toast.success(next ? "Your website is live! 🚀" : "Website unpublished (draft).");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to toggle publish.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleCopyLink() {
    if (!effectiveOrg) return;
    const link = `leadmachine.app/s/${effectiveOrg.slug}`;
    try {
      await navigator.clipboard.writeText(`https://${link}`);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy link.");
    }
  }

  if (loading) return <WebsiteTabSkeleton />;

  if (error) {
    return (
      <Card className="border-rose-200 bg-rose-50/50">
        <CardContent className="pt-6">
          <p className="text-sm text-rose-700">Couldn&apos;t load your website: {error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={reload}>
            <RefreshCw className="size-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!effectiveOrg) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-slate-600">Set up your business profile first.</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state: no website yet
  if (!website) {
    return (
      <EmptyState
        generating={generating}
        onGenerate={handleGenerate}
        org={effectiveOrg}
      />
    );
  }

  const publicUrl = `leadmachine.app/s/${effectiveOrg.slug}`;
  const templateMeta = TEMPLATES.find((t) => t.value === website.template);
  const industryMeta = INDUSTRIES.find((i) => i.value === effectiveOrg.industry);
  const brand = effectiveOrg.primaryColor || "#059669";

  return (
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
      {/* LEFT: live preview */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="size-4 text-emerald-600" />
                  Live Preview
                </CardTitle>
                <CardDescription className="mt-1">
                  A real-time render of your public website
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  onClick={() => setDevice("desktop")}
                  className={`size-8 rounded-md flex items-center justify-center transition-colors ${
                    device === "desktop" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                  }`}
                  aria-label="Desktop view"
                >
                  <Monitor className="size-4" />
                </button>
                <button
                  onClick={() => setDevice("mobile")}
                  className={`size-8 rounded-md flex items-center justify-center transition-colors ${
                    device === "mobile" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                  }`}
                  aria-label="Mobile view"
                >
                  <Smartphone className="size-4" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* fake browser bar */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-rose-400" />
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 mx-2">
                  <div className="bg-white rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-500 font-mono flex items-center gap-1.5">
                    <Lock className="size-3 text-emerald-500" />
                    {publicUrl}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  asChild
                >
                  <a href={`/s/${effectiveOrg.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                    Open full view
                  </a>
                </Button>
              </div>

              {/* preview iframe-like container */}
              <div
                className={`mx-auto bg-slate-50 transition-all ${
                  device === "mobile" ? "p-4" : "p-0"
                }`}
              >
                <div
                  className={`bg-white overflow-hidden ${
                    device === "mobile" ? "max-w-[380px] mx-auto rounded-2xl border border-slate-200 shadow-lg" : ""
                  }`}
                >
                  <PreviewSite website={website} org={effectiveOrg} brand={brand} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: controls */}
      <div className="space-y-4">
        {/* Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Website Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {website.published ? "Published" : "Draft"}
                </p>
                <p className="text-xs text-slate-500">
                  {website.published
                    ? "Visible to the public"
                    : "Only visible to you in this dashboard"}
                </p>
              </div>
              <Switch
                checked={website.published}
                disabled={publishing}
                onCheckedChange={(v) => handlePublish(v)}
              />
            </div>

            {website.published ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                    <span className="size-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                    Live
                  </Badge>
                  <span className="text-xs text-emerald-700">Your site is live</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-emerald-800 truncate flex-1">
                    {publicUrl}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0"
                    onClick={handleCopyLink}
                  >
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2">
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                  Draft
                </Badge>
                <span className="text-xs text-amber-700">
                  Toggle the switch to publish your site.
                </span>
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              Last updated {timeAgo(website.updatedAt)}
            </p>
          </CardContent>
        </Card>

        {/* AI Content */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-600" />
                AI Content
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                disabled={generating}
                onClick={handleGenerate}
              >
                {generating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Regenerate with AI
              </Button>
            </div>
            <CardDescription>AI-written copy. Read-only — edit coming in v1.1.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ContentBlock
              label="Hero headline"
              value={website.heroHeadline}
              onCopy={() => copyText(website.heroHeadline, "Hero headline")}
            />
            <ContentBlock
              label="Hero subtext"
              value={website.heroSubtext}
              multiline
              onCopy={() => copyText(website.heroSubtext, "Hero subtext")}
            />
            <ContentBlock
              label="About"
              value={website.aboutText}
              multiline
              onCopy={() => copyText(website.aboutText, "About text")}
            />
            <ContentBlock
              label="Call-to-action"
              value={website.ctaText}
              onCopy={() => copyText(website.ctaText, "CTA")}
            />
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">Services</p>
                <p className="text-xs text-slate-500">{website.services.length} items</p>
              </div>
              <Badge variant="secondary" className="font-mono">
                {website.services.length}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">FAQ entries</p>
                <p className="text-xs text-slate-500">{website.faq.length} items</p>
              </div>
              <Badge variant="secondary" className="font-mono">
                {website.faq.length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Template */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="size-4 text-emerald-600" />
              Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {templateMeta?.label ?? website.template}
                </p>
                <p className="text-xs text-slate-500">
                  {templateMeta?.description ?? "Custom template"}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {website.template}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="size-3" />
              More templates coming in v1.1
            </p>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction
              icon={Eye}
              label="View public site"
              hint={publicUrl}
              onClick={() => window.open(`/s/${effectiveOrg.slug}`, "_blank")}
            />
            <QuickAction
              icon={Share2}
              label="Share link"
              hint="Copy to clipboard"
              onClick={handleCopyLink}
            />
            <QuickAction
              icon={Zap}
              label="Regenerate content"
              hint="AI rewrite all sections"
              onClick={handleGenerate}
              loading={generating}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------- helpers / subcomponents ---------------------- */

function copyText(value: string | null, label: string) {
  if (!value) return;
  navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`${label} copied!`))
    .catch(() => toast.error("Couldn't copy."));
}

function EmptyState({
  generating,
  onGenerate,
  org,
}: {
  generating: boolean;
  onGenerate: () => void;
  org: Org;
}) {
  const industryMeta = INDUSTRIES.find((i) => i.value === org.industry);
  const preset = INDUSTRY_PRESETS[org.industry];

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="overflow-hidden border-emerald-200">
          <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 sm:p-12 text-center">
            <motion.div
              animate={generating ? { rotate: 360, scale: [1, 1.1, 1] } : {}}
              transition={generating ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
              className="size-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
            >
              {generating ? (
                <Loader2 className="size-8 text-white animate-spin" />
              ) : (
                <Sparkles className="size-8 text-white" />
              )}
            </motion.div>

            <AnimatePresence mode="wait">
              {generating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-6"
                >
                  <h3 className="text-xl font-bold text-slate-900">
                    AI is writing your website ✨
                  </h3>
                  <p className="text-sm text-slate-600 mt-1.5">
                    Crafting hero copy, services, about section and FAQs...
                  </p>
                  <div className="mt-5 flex justify-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="size-2 rounded-full bg-emerald-500"
                        animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-6"
                >
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                    Your website hasn&apos;t been generated yet.
                  </h3>
                  <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                    Click below and our AI will write a professional, conversion-ready website for{" "}
                    <span className="font-semibold text-slate-900">{org.name}</span> in seconds.
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs">
                    <Badge variant="outline" className="bg-white">
                      {preset?.emoji ?? "✨"} {industryMeta?.label ?? org.industry}
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      ~30 seconds
                    </Badge>
                    <Badge variant="outline" className="bg-white">
                      POPIA-ready
                    </Badge>
                  </div>

                  <Button
                    size="lg"
                    className="mt-7 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                    onClick={onGenerate}
                  >
                    <Sparkles className="size-4" />
                    Generate with AI
                  </Button>
                  <p className="text-[11px] text-slate-400 mt-3">
                    We&apos;ll use your business name, industry and services.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

function ContentBlock({
  label,
  value,
  multiline,
  onCopy,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
  onCopy: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [lastSyncedValue, setLastSyncedValue] = useState(value ?? "");

  // Sync draft when the upstream value changes (e.g. after Regenerate).
  // Using the React-recommended "derived state during render" pattern
  // instead of setState inside an effect to avoid cascading renders.
  if ((value ?? "") !== lastSyncedValue) {
    setLastSyncedValue(value ?? "");
    setDraft(value ?? "");
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </Label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditing((v) => !v)}
            className="size-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
            aria-label="Toggle edit"
          >
            <Pencil className="size-3" />
          </button>
          <button
            onClick={onCopy}
            className="size-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
            aria-label="Copy"
          >
            <Copy className="size-3" />
          </button>
        </div>
      </div>
      {editing ? (
        <div className="space-y-2">
          {multiline ? (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[80px] text-sm"
            />
          ) : (
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="text-sm" />
          )}
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <Lock className="size-2.5" /> Saved locally (full edit in v1.1)
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => {
                setEditing(false);
                toast.info("Edits are local-only for now — use Regenerate to update the saved copy.");
              }}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <p className={`text-sm text-slate-800 ${multiline ? "line-clamp-3 whitespace-pre-wrap" : "truncate"}`}>
          {editing ? draft : value || <span className="text-slate-400 italic">Not set</span>}
        </p>
      )}
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  hint,
  onClick,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors text-left disabled:opacity-50"
    >
      <span className="size-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {hint && <p className="text-xs text-slate-500 truncate">{hint}</p>}
      </div>
      <ChevronRight className="size-4 text-slate-400 shrink-0" />
    </button>
  );
}

/* ---------------------- live preview ---------------------- */

function PreviewSite({
  website,
  org,
  brand,
}: {
  website: Website;
  org: Org;
  brand: string;
}) {
  const industryEmoji = INDUSTRY_EMOJI[org.industry] ?? "✨";
  const headline = website.heroHeadline || `Welcome to ${org.name}`;
  const subtext =
    website.heroSubtext ||
    `Trusted ${org.industry} services for South African businesses.`;
  const cta = website.ctaText || "Get a Free Consultation";

  return (
    <div className="text-slate-900">
      {/* mini header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="size-6 rounded-md flex items-center justify-center text-xs shrink-0"
            style={{ backgroundColor: `${brand}15` }}
          >
            {industryEmoji}
          </span>
          <span className="text-xs font-semibold truncate">{org.name}</span>
        </div>
        <span
          className="text-[10px] font-semibold text-white px-2 py-0.5 rounded"
          style={{ backgroundColor: brand }}
        >
          {cta}
        </span>
      </div>

      {/* mini hero */}
      <div
        className="px-4 py-5"
        style={{
          background: `linear-gradient(135deg, ${brand}08, transparent 70%)`,
        }}
      >
        <span
          className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full mb-2"
          style={{ backgroundColor: `${brand}14`, color: brand }}
        >
          <Sparkles className="size-2.5" /> AI-assisted
        </span>
        <h1 className="text-base font-bold leading-tight line-clamp-2">{headline}</h1>
        <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{subtext}</p>
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold text-white px-2.5 py-1 rounded-md"
            style={{ backgroundColor: brand }}
          >
            {cta}
          </span>
          <span className="text-[10px] text-slate-500">⚡ Avg reply &lt; 2 hrs</span>
        </div>
      </div>

      {/* mini services */}
      <div className="px-4 py-4 border-t border-slate-100">
        <p className="text-[11px] font-bold text-slate-900 mb-2">Our services</p>
        <div className="grid grid-cols-2 gap-2">
          {website.services.slice(0, 4).map((s, i) => (
            <div key={i} className="rounded-lg border border-slate-100 p-2">
              <div
                className="size-5 rounded flex items-center justify-center mb-1"
                style={{ backgroundColor: `${brand}14`, color: brand }}
              >
                <Sparkles className="size-2.5" />
              </div>
              <p className="text-[10px] font-semibold text-slate-800 leading-tight line-clamp-1">
                {s.name}
              </p>
              <p className="text-[9px] text-slate-500 leading-tight line-clamp-2 mt-0.5">
                {s.description}
              </p>
            </div>
          ))}
          {website.services.length === 0 && (
            <p className="text-[10px] text-slate-400 col-span-2">No services yet.</p>
          )}
        </div>
      </div>

      {/* mini about + cta */}
      <div className="px-4 py-4 border-t border-slate-100 bg-slate-50/50">
        <p className="text-[11px] font-bold text-slate-900 mb-1">About {org.name}</p>
        <p className="text-[10px] text-slate-600 line-clamp-3 leading-relaxed">
          {website.aboutText || `${org.name} serves South African businesses with professional, reliable service.`}
        </p>
        <div
          className="mt-3 rounded-lg p-2.5 text-center text-white"
          style={{ backgroundColor: brand }}
        >
          <p className="text-[10px] font-semibold">{cta} — fill the form!</p>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-slate-100 bg-slate-900 text-slate-400">
        <p className="text-[9px]">
          © {new Date().getFullYear()} {org.name} • Powered by{" "}
          <span className="text-emerald-400 font-semibold">Lead Machine</span> 🇿🇦
        </p>
      </div>
    </div>
  );
}

/* ---------------------- skeleton ---------------------- */

function WebsiteTabSkeleton() {
  return (
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-full mb-3" />
            <Skeleton className="h-[460px] w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export { WebsiteTab };
