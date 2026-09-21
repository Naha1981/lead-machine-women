import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { auditWebsite } from "@/modules/audit/engine";
import {
  listAuditProjects,
  verifyAuditProject,
} from "@/modules/audit/project-service";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  projectId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clerkUser = await currentUser();
    const user = await getOrCreateUserByClerkId(userId, {
      email: clerkUser?.emailAddresses?.[0]?.emailAddress,
    });
    const org = await getOwnedOrgForUser(user.id);
    if (!org) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid verification request." }, { status: 400 });

    const project = (await listAuditProjects(org.id)).find((item) => item.id === parsed.data.projectId);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (project.status !== "deployed") {
      return NextResponse.json({ error: "Record the client deployment before running the re-audit." }, { status: 409 });
    }

    const reAudit = await auditWebsite(project.audit.finalUrl);
    const verified = await verifyAuditProject({
      orgId: org.id,
      userId: user.id,
      projectId: project.id,
      reAudit,
    });

    return NextResponse.json({
      project: verified,
      verification: verified?.verification,
    });
  } catch (error) {
    console.error("[audit verify]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not verify the deployed implementation." },
      { status: 500 }
    );
  }
}
