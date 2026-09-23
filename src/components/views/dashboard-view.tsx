"use client";

import dynamic from "next/dynamic";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OverviewTab } from "@/components/dashboard/overview-tab";
import { LeadsTab } from "@/components/dashboard/leads-tab";
import { SettingsTab } from "@/components/dashboard/settings-tab";
import { BillingTab } from "@/components/dashboard/billing-tab";
import { AnalyticsTab } from "@/components/dashboard/analytics-tab";
import { AuditWorkspaceTab } from "@/components/dashboard/audit-workspace-tab";
import { useAppStore } from "@/store/app-store";
import { Skeleton } from "@/components/ui/skeleton";

// Another agent owns website-tab.tsx — load it lazily so this shell never
// breaks even if that file is mid-flight.
const WebsiteTab = dynamic(
  () => import("@/components/dashboard/website-tab").then((m) => m.default),
  {
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full rounded-xl" />,
  }
);

export default function DashboardView() {
  const tab = useAppStore((s) => s.dashboardTab);

  return (
    <DashboardShell>
      {tab === "overview" && <OverviewTab />}
      {tab === "leads" && <LeadsTab />}
      {tab === "website" && <WebsiteTab />}
      {tab === "audit" && <AuditWorkspaceTab />}
      {tab === "analytics" && <AnalyticsTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "billing" && <BillingTab />}
    </DashboardShell>
  );
}
