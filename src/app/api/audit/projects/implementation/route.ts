import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { listAuditProjects } from "@/modules/audit/project-service";
import { buildImplementationPlan } from "@/modules/audit/implementation";

export const dynamic = "force-dynamic";

const schema = z.object({
  projectId: z.string().uuid(),
  targetPaths: z.array(z.string().min(1)).max(20).optional(),
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
    if (!parsed.success) return NextResponse.json({ error: "Invalid implementation request." }, { status: 400 });

    const project = (await listAuditProjects(org.id)).find((item) => item.id === parsed.data.projectId);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    if (project.status !== "approved") {
      return NextResponse.json(
        { error: "Approve the Fix Pack before generating implementation work." },
        { status: 409 }
      );
    }

    const plan = buildImplementationPlan(
      project.audit.domain,
      project.fixPack,
      parsed.data.targetPaths
    );

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("[audit implementation]", error);
    return NextResponse.json({ error: "Could not generate the implementation plan." }, { status: 500 });
  }
}
