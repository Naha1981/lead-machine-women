"use client";

import * as React from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient, useAsync } from "@/lib/api-client";
import type { AuditProject, AuditProjectStatus } from "@/modules/audit/project-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_ORDER: AuditProjectStatus[] = [
  "diagnosed",
  "approved",
  "building",
  "deployed",
  "verified",
];

const STATUS_LABEL: Record<AuditProjectStatus, string> = {
  diagnosed: "Diagnosed",
  approved: "Approved",
  building: "Building",
  deployed: "Deployed",
  verified: "Verified",
};

export function AuditWorkspaceTab() {
  const { data, loading, error, reload } = useAsync(() => apiClient.listAuditProjects(), []);
  const [url, setUrl] = React.useState("");
  const [scanning, setScanning] = React.useState(false);

  async function startAudit(event: React.FormEvent) {
    event.preventDefault();
    setScanning(true);
    try {
      const audit = await apiClient.runAudit(url.trim());
      await apiClient.createAuditProject(audit);
      setUrl("");
      reload();
      toast.success("Audit added to the fix workspace.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Audit failed.");
    } finally {
      setScanning(false);
    }
  }

  async function move(projectId: string, status: AuditProjectStatus) {
    try {
      await apiClient.updateAuditProjectStatus(projectId, status);
      reload();
      toast.success(`Project moved to ${STATUS_LABEL[status]}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update project.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-emerald-200">
        <CardHeader className="bg-gradient-to-br from-emerald-50 via-white to-teal-50">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="size-5 text-emerald-600" />
            Revenue Leak Fix Workspace
          </CardTitle>
          <CardDescription>
            Diagnose → approve → build → deploy → verify. The audit is the work order.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={startAudit} className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://client-website.co.za"
              type="url"
              required
              className="h-11"
            />
            <Button disabled={scanning} className="h-11 bg-emerald-600 hover:bg-emerald-700">
              {scanning ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
              {scanning ? "Auditing..." : "New audit"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            This runs the same rules-first engine as the public audit. No client code is changed.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {data?.projects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Globe2 className="size-10 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No fix projects yet</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Run the first audit above. Every finding will become a concrete implementation checklist.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {(data?.projects ?? []).map((project) => {
          const currentIndex = STATUS_ORDER.indexOf(project.status);
          const nextStatus = STATUS_ORDER[currentIndex + 1];

          return (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{project.audit.domain}</CardTitle>
                    <CardDescription className="truncate">{project.audit.finalUrl}</CardDescription>
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {STATUS_LABEL[project.status]}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Metric label="Score" value={String(project.audit.score)} />
                  <Metric label="Findings" value={String(project.audit.findings.length)} />
                  <Metric label="Actions" value={String(project.fixPack.priorityActions.length)} />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>Implementation progress</span>
                    <span>{Math.round(((currentIndex + 1) / STATUS_ORDER.length) * 100)}%</span>
                  </div>
                  <Progress value={((currentIndex + 1) / STATUS_ORDER.length) * 100} />
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">First actions</p>
                  <ul className="mt-2 space-y-2">
                    {project.fixPack.priorityActions.slice(0, 3).map((action) => (
                      <li key={action.findingId} className="flex gap-2 text-sm text-slate-700">
                        <Wrench className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>{action.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={project.audit.finalUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1.5 size-3.5" />
                      Open site
                    </a>
                  </Button>
                  {nextStatus && (
                    <Button size="sm" onClick={() => move(project.id, nextStatus)} className="bg-emerald-600 hover:bg-emerald-700">
                      {nextStatus === "building" ? "Start building" : nextStatus === "deployed" ? "Mark deployed" : nextStatus === "verified" ? "Mark verified" : "Approve"}
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Button>
                  )}
                  {project.status === "verified" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="size-4" /> Ready for before/after proof
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
