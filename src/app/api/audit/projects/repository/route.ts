import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  connectAuditProjectRepository,
  listAuditProjects,
} from "@/modules/audit/project-service";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { getGitHubRepository, normalizeRepoFullName } from "@/lib/github";

export const dynamic = "force-dynamic";

const schema = z.object({
  projectId: z.string().uuid(),
  repositoryFullName: z.string().min(3).max(200),
  baseBranch: z.string().min(1).max(100).default("main"),
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
      return NextResponse.json({ error: "Confirm the authorised GitHub repository before connecting it." }, { status: 400 });
    }

    const project = (await listAuditProjects(org.id)).find((item) => item.id === parsed.data.projectId);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (project.status !== "approved") {
      return NextResponse.json({ error: "Approve the Fix Pack before connecting a repository." }, { status: 409 });
    }

    const repositoryFullName = normalizeRepoFullName(parsed.data.repositoryFullName);
    const repo = await getGitHubRepository(repositoryFullName);

    if (parsed.data.baseBranch !== repo.default_branch) {
      return NextResponse.json(
        { error: `Base branch does not match the repository default branch (${repo.default_branch}).` },
        { status: 400 }
      );
    }

    const connected = await connectAuditProjectRepository({
      orgId: org.id,
      userId: user.id,
      projectId: project.id,
      repository: {
        provider: "github",
        repositoryFullName,
        baseBranch: repo.default_branch,
        connectedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ project: connected });
  } catch (error) {
    console.error("[audit repository connect]", error);
    const message = error instanceof Error ? error.message : "Could not connect the GitHub repository.";
    const status = /not configured/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
