import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { emitEvent } from "@/modules/events/service";
import { buildFixPack, type FixPack } from "@/modules/audit/fix-engine";
import type { AuditResult } from "@/modules/audit/engine";

const PROJECT_EVENTS = [
  "audit.project.created",
  "audit.project.status_changed",
  "audit.project.repository_connected",
  "audit.project.implementation_started",
  "audit.project.ci_updated",
  "audit.project.verified",
] as const;

export type AuditProjectStatus =
  | "diagnosed"
  | "approved"
  | "building"
  | "deployed"
  | "verified";

export type AuditRepositoryBinding = {
  provider: "github";
  repositoryFullName: string;
  baseBranch: string;
  connectedAt: string;
};

export type AuditImplementation = {
  branchName: string;
  pullRequestNumber: number;
  pullRequestUrl: string;
  status: "awaiting-ci" | "ci-passed" | "ci-failed" | "ready-for-client-review" | "merged";
  changedFiles: string[];
  startedAt: string;
  updatedAt: string;
};

export type AuditProject = {
  id: string;
  audit: AuditResult;
  fixPack: FixPack;
  status: AuditProjectStatus;
  repository?: AuditRepositoryBinding;
  implementation?: AuditImplementation;
  createdAt: string;
  updatedAt: string;
};

type ProjectPayload = {
  projectId: string;
  audit: AuditResult;
  fixPack: FixPack;
  status: AuditProjectStatus;
  repository?: AuditRepositoryBinding;
  implementation?: AuditImplementation;
};

function projectFromEvent(row: typeof events.$inferSelect): AuditProject | null {
  const payload = row.payload as Partial<ProjectPayload> | null;
  if (!payload?.projectId || !payload.audit || !payload.fixPack) return null;
  return {
    id: payload.projectId,
    audit: payload.audit,
    fixPack: payload.fixPack,
    status: payload.status ?? "diagnosed",
    repository: payload.repository,
    implementation: payload.implementation,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.createdAt.toISOString(),
  };
}

function payloadFor(project: AuditProject): ProjectPayload {
  return {
    projectId: project.id,
    audit: project.audit,
    fixPack: project.fixPack,
    status: project.status,
    repository: project.repository,
    implementation: project.implementation,
  };
}

export async function createAuditProject(opts: {
  orgId: string;
  userId: string;
  audit: AuditResult;
}): Promise<AuditProject> {
  const fixPack = buildFixPack(opts.audit);
  const projectId = crypto.randomUUID();
  const now = new Date().toISOString();

  await emitEvent({
    orgId: opts.orgId,
    userId: opts.userId,
    eventType: "audit.project.created",
    payload: {
      projectId,
      audit: opts.audit,
      fixPack,
      status: "diagnosed",
      createdAt: now,
    },
  });

  return {
    id: projectId,
    audit: opts.audit,
    fixPack,
    status: "diagnosed",
    createdAt: now,
    updatedAt: now,
  };
}

export async function listAuditProjects(orgId: string): Promise<AuditProject[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.orgId, orgId),
        inArray(events.eventType, [...PROJECT_EVENTS])
      )
    )
    .orderBy(desc(events.createdAt))
    .limit(500);

  const projects = new Map<string, AuditProject>();
  for (const row of rows) {
    const parsed = projectFromEvent(row);
    if (!parsed || projects.has(parsed.id)) continue;
    projects.set(parsed.id, parsed);
  }

  return [...projects.values()].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
  );
}

export async function updateAuditProjectStatus(opts: {
  orgId: string;
  userId: string;
  projectId: string;
  status: AuditProjectStatus;
}): Promise<AuditProject | null> {
  const projects = await listAuditProjects(opts.orgId);
  const current = projects.find((item) => item.id === opts.projectId);
  if (!current) return null;

  const updatedAt = new Date().toISOString();
  await emitEvent({
    orgId: opts.orgId,
    userId: opts.userId,
    eventType: opts.status === "verified" ? "audit.project.verified" : "audit.project.status_changed",
    payload: {
      ...payloadFor({ ...current, status: opts.status, updatedAt } as AuditProject),
      updatedAt,
    },
  });

  return { ...current, status: opts.status, updatedAt };
}

export async function connectAuditProjectRepository(opts: {
  orgId: string;
  userId: string;
  projectId: string;
  repository: AuditRepositoryBinding;
}): Promise<AuditProject | null> {
  const current = (await listAuditProjects(opts.orgId)).find((item) => item.id === opts.projectId);
  if (!current) return null;
  const updatedAt = new Date().toISOString();
  const next = { ...current, repository: opts.repository, updatedAt };

  await emitEvent({
    orgId: opts.orgId,
    userId: opts.userId,
    eventType: "audit.project.repository_connected",
    payload: payloadFor(next),
  });

  return next;
}

export async function recordAuditProjectImplementation(opts: {
  orgId: string;
  userId: string;
  projectId: string;
  implementation: AuditImplementation;
}): Promise<AuditProject | null> {
  const current = (await listAuditProjects(opts.orgId)).find((item) => item.id === opts.projectId);
  if (!current) return null;
  const updatedAt = new Date().toISOString();
  const next = { ...current, implementation: opts.implementation, status: "building" as const, updatedAt };

  await emitEvent({
    orgId: opts.orgId,
    userId: opts.userId,
    eventType: "audit.project.implementation_started",
    payload: payloadFor(next),
  });

  return next;
}

export async function updateAuditProjectCi(opts: {
  orgId: string;
  userId: string;
  projectId: string;
  status: AuditImplementation["status"];
}): Promise<AuditProject | null> {
  const current = (await listAuditProjects(opts.orgId)).find((item) => item.id === opts.projectId);
  if (!current?.implementation) return null;
  const updatedAt = new Date().toISOString();
  const implementation = { ...current.implementation, status: opts.status, updatedAt };
  const next = { ...current, implementation, updatedAt };

  await emitEvent({
    orgId: opts.orgId,
    userId: opts.userId,
    eventType: "audit.project.ci_updated",
    payload: payloadFor(next),
  });

  return next;
}
