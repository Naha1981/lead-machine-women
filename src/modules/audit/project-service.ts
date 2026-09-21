import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { emitEvent } from "@/modules/events/service";
import { buildFixPack, type FixPack } from "@/modules/audit/fix-engine";
import type { AuditResult } from "@/modules/audit/engine";

const PROJECT_EVENTS = [
  "audit.project.created",
  "audit.project.status_changed",
  "audit.project.verified",
] as const;

export type AuditProjectStatus = "diagnosed" | "approved" | "building" | "deployed" | "verified";

export type AuditProject = {
  id: string;
  audit: AuditResult;
  fixPack: FixPack;
  status: AuditProjectStatus;
  createdAt: string;
  updatedAt: string;
};

type ProjectPayload = {
  projectId: string;
  audit: AuditResult;
  fixPack: FixPack;
  status: AuditProjectStatus;
};

function projectFromEvent(row: typeof events.$inferSelect): AuditProject | null {
  const payload = row.payload as Partial<ProjectPayload> | null;
  if (!payload?.projectId || !payload.audit || !payload.fixPack) return null;
  return {
    id: payload.projectId,
    audit: payload.audit,
    fixPack: payload.fixPack,
    status: payload.status ?? "diagnosed",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.createdAt.toISOString(),
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
    .limit(250);

  const projects = new Map<string, AuditProject>();
  for (const row of rows) {
    const parsed = projectFromEvent(row);
    if (!parsed || projects.has(parsed.id)) continue;
    projects.set(parsed.id, parsed);
  }

  // Status events carry the same full project payload, so newest event wins.
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

  const eventType =
    opts.status === "verified"
      ? "audit.project.verified"
      : "audit.project.status_changed";

  const updatedAt = new Date().toISOString();
  await emitEvent({
    orgId: opts.orgId,
    userId: opts.userId,
    eventType,
    payload: {
      projectId: current.id,
      audit: current.audit,
      fixPack: current.fixPack,
      status: opts.status,
      updatedAt,
    },
  });

  return { ...current, status: opts.status, updatedAt };
}
