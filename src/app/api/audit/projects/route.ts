import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  createAuditProject,
  listAuditProjects,
  updateAuditProjectStatus,
  type AuditProjectStatus,
} from "@/modules/audit/project-service";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import type { AuditResult } from "@/modules/audit/engine";

export const dynamic = "force-dynamic";

const auditSchema = z.object({
  url: z.string(),
  finalUrl: z.string(),
  domain: z.string(),
  scannedAt: z.string(),
  score: z.number(),
  grade: z.enum(["strong", "needs-attention", "high-leak-risk"]),
  summary: z.string(),
  findings: z.array(z.any()),
  fixPlan: z.array(z.any()),
  metrics: z.any(),
  signals: z.record(z.string(), z.boolean()),
  pagespeed: z.any().nullable(),
});

const createSchema = z.object({ audit: auditSchema });
const statusSchema = z.object({
  projectId: z.string().uuid(),
  status: z.enum(["diagnosed", "approved", "building", "deployed", "verified"]),
});

async function getContext() {
  const { userId } = await auth();
  if (!userId) return null;
  const clerkUser = await currentUser();
  const user = await getOrCreateUserByClerkId(userId, {
    email: clerkUser?.emailAddresses?.[0]?.emailAddress,
  });
  const org = await getOwnedOrgForUser(user.id);
  if (!org) return null;
  return { user, org };
}

export async function GET() {
  try {
    const context = await getContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const projects = await listAuditProjects(context.org.id);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("[audit projects GET]", error);
    return NextResponse.json({ error: "Could not load audit projects." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const context = await getContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid audit payload." }, { status: 400 });

    const project = await createAuditProject({
      orgId: context.org.id,
      userId: context.user.id,
      audit: parsed.data.audit as AuditResult,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("[audit projects POST]", error);
    return NextResponse.json({ error: "Could not create the audit project." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const context = await getContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = statusSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid project status." }, { status: 400 });

    const project = await updateAuditProjectStatus({
      orgId: context.org.id,
      userId: context.user.id,
      projectId: parsed.data.projectId,
      status: parsed.data.status as AuditProjectStatus,
    });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json({ project });
  } catch (error) {
    console.error("[audit projects PATCH]", error);
    return NextResponse.json({ error: "Could not update the project." }, { status: 500 });
  }
}
