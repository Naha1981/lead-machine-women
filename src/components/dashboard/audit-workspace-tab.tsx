"use client";

import * as React from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
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
  const [repoByProject, setRepoByProject] = React.useState<Record<string, string>>({});
  const [authByProject, setAuthByProject] = React.useState<Record<string, boolean>>({});
  const [busyProject, setBusyProject] = React.useState<string | null>(null);

  async function startAudit(event: React.FormEvent) {
    event.preventDefault();
    setBusyProject("new");
    try {
      const audit = await apiClient.runAudit(url.trim());
      await apiClient.createAuditProject(audit);
      setUrl("");
      reload();
      toast.success("Audit added to the fix workspace.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Audit failed.");
    } finally {
      setBusyProject(null);
    }
  }

  async function move(projectId: string, status: AuditProjectStatus) {
    setBusyProject(projectId);
    try {
      await apiClient.updateAuditProjectStatus(projectId, status);
      reload();
      toast.success(`Project moved to ${STATUS_LABEL[status]}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update project.");
    } finally {
      setBusyProject(null);
    }
  }

  async function connectRepository(project: AuditProject) {
    const repositoryFullName = repoByProject[project.id]?.trim();
    if (!repositoryFullName) {
      toast.error("Enter the GitHub repository in owner/name format.");
      return;
    }
    if (!authByProject[project.id]) {
      toast.error("Confirm that the client has explicitly authorised NahaLabs access to this repository.");
      return;
    }

    setBusyProject(project.id);
    try {
      await apiClient.connectAuditRepository({
        projectId: project.id,
        repositoryFullName,
        baseBranch: "main",
        authorizationConfirmed: true,
      });
      reload();
      toast.success("Authorised repository connected and access verified.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not connect repository.");
    } finally {
      setBusyProject(null);
    }
  }

  async function build(project: AuditProject) {
    setBusyProject(project.id);
    try {
      const result = await apiClient.buildAuditImplementation(project.id);
      reload();
      toast.success(`Draft PR #${result.pullRequest.number} created. Client CI now owns the verification gate.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build implementation.");
    } finally {
      setBusyProject(null);
    }
  }

  async function syncImplementation(project: AuditProject) {
    setBusyProject(project.id);
    try {
      await apiClient.syncAuditImplementation(project.id);
      reload();
      toast.success("GitHub PR and CI status refreshed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not refresh implementation status.");
    } finally {
      setBusyProject(null);
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
            Diagnose → approve → authorise → build → client CI → deploy → verify. The audit is the work order.
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
            <Button disabled={busyProject === "new"} className="h-11 bg-emerald-600 hover:bg-emerald-700">
              {busyProject === "new" ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
              {busyProject === "new" ? "Auditing..." : "New audit"}
            </Button>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            No client code is changed during diagnosis. Repository access is a separate explicit authorisation step.
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
              Run the first audit above. Every finding becomes an implementation work item.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {(data?.projects ?? []).map((project: AuditProject) => {
          const currentIndex = STATUS_ORDER.indexOf(project.status);
          const nextStatus = STATUS_ORDER[currentIndex + 1];
          const isBusy = busyProject === project.id;
          const implStatus = project.implementation?.status;

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

                {project.status === "approved" && !project.repository && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-950">1. Authorise the client repository</p>
                    <p className="mt-1 text-xs text-amber-900">
                      The client keeps ownership. NahaLabs creates a branch and PR only after repository access is explicitly authorised and verified.
                    </p>
                    <div className="mt-3 space-y-3">
                      <Input
                        value={repoByProject[project.id] ?? ""}
                        onChange={(event) =>
                          setRepoByProject((current) => ({ ...current, [project.id]: event.target.value }))
                        }
                        placeholder="client-org/client-website"
                        disabled={isBusy}
                      />
                      <label className="flex items-start gap-2 text-xs text-amber-900">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={authByProject[project.id] ?? false}
                          onChange={(event) =>
                            setAuthByProject((current) => ({ ...current, [project.id]: event.target.checked }))
                          }
                          disabled={isBusy}
                        />
                        <span>I confirm the client has explicitly authorised NahaLabs to access this repository and create a reviewable pull request. NahaLabs will not merge or deploy it.</span>
                      </label>
                      <Button size="sm" onClick={() => connectRepository(project)} disabled={isBusy}>
                        {isBusy ? <RefreshCw className="mr-1.5 size-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 size-3.5" />}
                        {isBusy ? "Verifying..." : "Connect authorised repo"}
                      </Button>
                    </div>
                  </div>
                )}

                {project.repository && (
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Authorised repository</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{project.repository.repositoryFullName}</p>
                        <p className="text-xs text-slate-500">Base branch: {project.repository.baseBranch}</p>
                      </div>
                      <CircleDot className="size-4 text-emerald-600" />
                    </div>
                    {!project.implementation && project.status === "approved" && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button size="sm" onClick={() => build(project)} disabled={isBusy}>
                          {isBusy ? <RefreshCw className="mr-1.5 size-3.5 animate-spin" /> : <Wrench className="mr-1.5 size-3.5" />}
                          {isBusy ? "Building..." : "Start building"}
                        </Button>
                        <span className="text-xs text-slate-500">Creates a draft PR. No merge or deployment.</span>
                      </div>
                    )}
                    {project.implementation && (
                      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Implementation PR</p>
                            <p className="mt-1 text-sm font-medium text-slate-900">#{project.implementation.pullRequestNumber}</p>
                          </div>
                          <Badge variant="outline">{project.implementation.status}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-slate-600">
                          Changed: {project.implementation.changedFiles.join(", ")}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={project.implementation.pullRequestUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-1.5 size-3.5" />
                              Open PR
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => syncImplementation(project)} disabled={isBusy}>
                            <RefreshCw className={`mr-1.5 size-3.5 ${isBusy ? "animate-spin" : ""}`} />
                            Refresh CI
                          </Button>
                        </div>
                        {implStatus === "ci-passed" && (
                          <p className="mt-2 text-xs font-medium text-emerald-700">
                            CI passed. Client engineering can review and merge the draft PR.
                          </p>
                        )}
                        {implStatus === "ci-failed" && (
                          <p className="mt-2 text-xs font-medium text-red-700">
                            CI failed. The client team can review the failed checks before any merge.
                          </p>
                        )}
                        {implStatus === "merged" && project.status === "building" && (
                          <div className="mt-3">
                            <Button size="sm" onClick={() => move(project.id, "deployed")} disabled={isBusy}>
                              Record client deployment
                              <ArrowRight className="ml-1.5 size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={project.audit.finalUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1.5 size-3.5" />
                      Open site
                    </a>
                  </Button>

                  {!project.repository && project.status === "diagnosed" && nextStatus === "approved" && (
                    <Button size="sm" onClick={() => move(project.id, "approved")} disabled={isBusy} className="bg-emerald-600 hover:bg-emerald-700">
                      Approve Fix Pack
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Button>
                  )}

                  {project.status === "deployed" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                      <CircleDot className="size-4" />
                      Re-audit before verification
                    </span>
                  )}

                  {project.status === "verified" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="size-4" />
                      Before/after proof recorded
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
