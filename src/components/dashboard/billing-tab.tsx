"use client";

import * as React from "react";
import {
  CreditCard,
  Check,
  Crown,
  Zap,
  Building2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { apiClient, useAsync } from "@/lib/api-client";
import { PLANS, formatZar } from "@/lib/constants";
import type { Subscription } from "@/types";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PLAN_ICONS: Record<string, React.ElementType> = {
  trial: Sparkles,
  starter: Zap,
  growth: Crown,
  agency: Building2,
};

function statusBadge(status?: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
          <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />
          Active
        </Badge>
      );
    case "trial":
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
          <span className="mr-1 inline-block size-1.5 rounded-full bg-amber-500" />
          Trial
        </Badge>
      );
    case "past_due":
      return (
        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
          <span className="mr-1 inline-block size-1.5 rounded-full bg-rose-500" />
          Past due
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-600">
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-600">
          None
        </Badge>
      );
  }
}

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 0;
  const diff = +new Date(dateStr) - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ---------- Current Plan Card ----------
function CurrentPlanCard({
  subscription,
  orgPlan,
  trialEndsAt,
  onReload,
}: {
  subscription: Subscription | null;
  orgPlan: string;
  trialEndsAt: string | null;
  onReload: () => void;
}) {
  const isTrial = orgPlan === "trial" || subscription?.status === "trial";
  const planMeta = PLANS.find((p) => p.id === orgPlan);
  const trialEnd = trialEndsAt ?? subscription?.currentPeriodEnd ?? null;
  const daysLeft = daysUntil(trialEnd);
  const trialTotal = 7;
  const trialProgress = isTrial
    ? Math.max(0, Math.min(100, (daysLeft / trialTotal) * 100))
    : 0;

  const periodEnd = subscription?.currentPeriodEnd;

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/40">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-md bg-emerald-600 text-white shadow-sm">
              <CreditCard className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base">Current Plan</CardTitle>
              <CardDescription className="text-xs">
                Your subscription details and renewal date.
              </CardDescription>
            </div>
          </div>
          {statusBadge(subscription?.status ?? (orgPlan === "trial" ? "trial" : undefined))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              {planMeta?.name ?? orgPlan}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {planMeta
                ? planMeta.priceZar === 0
                  ? "Free"
                  : formatZar(planMeta.priceZar * 100)
                : "—"}
              <span className="text-sm font-medium text-muted-foreground">
                {planMeta ? ` / ${planMeta.period}` : ""}
              </span>
            </p>
            {planMeta && (
              <p className="mt-1 text-xs text-muted-foreground">
                {planMeta.tagline}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReload}
            className="text-emerald-700 hover:bg-emerald-100"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        </div>

        {isTrial && trialEnd ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-amber-700">
                <Calendar className="size-3.5" />
                Trial ends in {daysLeft} day{daysLeft === 1 ? "" : "s"}
              </span>
              <span className="text-muted-foreground">
                {trialEnd ? new Date(trialEnd).toLocaleDateString("en-ZA") : ""}
              </span>
            </div>
            <Progress value={trialProgress} className="h-2 bg-amber-100 [&>div]:bg-amber-500" />
            <p className="text-[11px] text-amber-700">
              Pick a plan below to keep your leads flowing after the trial ends.
            </p>
          </div>
        ) : periodEnd ? (
          <div className="flex items-center justify-between rounded-md bg-white/60 p-3 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Calendar className="size-3.5" />
              Current period ends
            </span>
            <span className="font-medium text-slate-900">
              {new Date(periodEnd).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        ) : null}

        {subscription?.amountZar ? (
          <p className="text-[11px] text-muted-foreground">
            Billed {formatZar(subscription.amountZar)} per{" "}
            {planMeta?.period ?? "month"} · Next charge{" "}
            {periodEnd ? new Date(periodEnd).toLocaleDateString("en-ZA") : "—"}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ---------- Plan Card ----------
function PlanCard({
  planId,
  isCurrent,
  isTrial,
  onSubscribe,
  subscribing,
}: {
  planId: string;
  isCurrent: boolean;
  isTrial: boolean;
  onSubscribe: () => void;
  subscribing: boolean;
}) {
  const plan = PLANS.find((p) => p.id === planId)!;
  const Icon = PLAN_ICONS[planId] ?? Sparkles;
  const highlight = plan.highlight;

  return (
    <Card
      className={cn(
        "relative flex flex-col py-0 transition-shadow",
        highlight && !isCurrent && "ring-2 ring-emerald-400",
        isCurrent && "ring-2 ring-emerald-500"
      )}
    >
      {highlight && !isCurrent && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <Badge className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-600">
            Most popular
          </Badge>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "grid size-8 place-items-center rounded-md",
              isCurrent
                ? "bg-emerald-600 text-white"
                : "bg-emerald-100 text-emerald-700"
            )}
          >
            <Icon className="size-4" />
          </div>
          <CardTitle className="text-base">{plan.name}</CardTitle>
          {isCurrent && (
            <Badge className="ml-auto bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              <Check className="size-3" />
              Current
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {plan.priceZar === 0 ? "Free" : formatZar(plan.priceZar * 100)}
            <span className="text-xs font-medium text-muted-foreground">
              {" "}
              / {plan.period}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{plan.tagline}</p>
        </div>

        <Separator />

        <ul className="flex-1 space-y-1.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-slate-700">
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={onSubscribe}
          disabled={isCurrent || isTrial || subscribing}
          className={cn(
            "mt-2 w-full",
            isCurrent
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          )}
          variant={isCurrent ? "secondary" : "default"}
        >
          {isCurrent
            ? "Current plan"
            : planId === "trial"
            ? "Trial ended"
            : subscribing
            ? "Processing..."
            : `Switch to ${plan.name}`}
        </Button>
        {planId === "trial" && !isCurrent && (
          <p className="text-center text-[10px] text-muted-foreground">
            One trial per business.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Main ----------
export function BillingTab() {
  const { data, loading, reload } = useAsync(() => apiClient.getBilling(), []);
  const [subscribingId, setSubscribingId] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState(false);

  const subscription = data?.subscription ?? null;
  const orgPlan = data?.orgPlan ?? "trial";
  const trialEndsAt = data?.trialEndsAt ?? null;

  async function handleSubscribe(planId: string) {
    if (planId === "trial") return;
    setSubscribingId(planId);
    try {
      await apiClient.subscribe(planId as "starter" | "growth" | "agency");
      toast.success(`Switched to ${planId} plan`);
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to subscribe");
    } finally {
      setSubscribingId(null);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    // Simulated cancellation — just toast and reload.
    setTimeout(() => {
      toast.success("Subscription cancelled (simulated)");
      setCancelling(false);
      reload();
    }, 600);
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Billing
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your subscription, upgrade or cancel anytime.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              disabled={!subscription || cancelling}
              className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            >
              <AlertTriangle className="size-4" />
              {cancelling ? "Cancelling..." : "Cancel subscription"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
              <AlertDialogDescription>
                This is a simulated cancellation. Your plan will remain active
                until the end of the current billing period. You can re-subscribe
                at any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep plan</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                Yes, cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Current plan */}
      <CurrentPlanCard
        subscription={subscription}
        orgPlan={orgPlan}
        trialEndsAt={trialEndsAt}
        onReload={reload}
      />

      {/* Plan cards */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Available plans
          </h3>
          <Separator className="flex-1" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              planId={plan.id}
              isCurrent={orgPlan === plan.id}
              isTrial={false}
              onSubscribe={() => handleSubscribe(plan.id)}
              subscribing={subscribingId === plan.id}
            />
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="flex items-start gap-2 rounded-md bg-slate-50 p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <p>
          Payments are processed by{" "}
          <span className="font-medium text-slate-700">Paystack</span>. ZAR
          billing. Cancel anytime. Prices exclude VAT.
        </p>
      </div>
    </div>
  );
}
