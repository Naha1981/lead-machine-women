import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import { listAuditProjects } from "@/modules/audit/project-service";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import {
  createGitHubAppInstallUrl,
  createGitHubAppState,
  normalizeRepoFullName,
} from "@/lib/github";

export const dynamic = "force-dynamic";

const schema = z.object({
  projectId: z.string().uuid(),
  repositoryFullName: z.string().min(3).max(200),
  authorizationConfirmed: z.literal(true),
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
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Confirm the repository and explicit client authorization before continuing." },
        { status: 400 }
      );
    }

    const project = (await listAuditProjects(org.id)).find((item) => item.id === parsed.data.projectId);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (project.status !== "approved") {
      return NextResponse.json({ error: "Approve the Fix Pack before authorising a repository." }, { status: 409 });
    }
    if (project.repository) {
      return NextResponse.json({ error: "A GitHub repository is already connected to this project." }, { status: 409 });
    }

    const repositoryFullName = normalizeRepoFullName(parsed.data.repositoryFullName);
    const state = createGitHubAppState({
      orgId: org.id,
      userId: user.id,
      projectId: project.id,
      repositoryFullName,
    });

    return NextResponse.json({
      installUrl: createGitHubAppInstallUrl(state),
      repositoryFullName,
    });
  } catch (error) {
    console.error("[audit github authorization start]", error);
    const message =
      error instanceof Error ? error.message : "Could not start GitHub repository authorization.";
    const status = /not configured/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
