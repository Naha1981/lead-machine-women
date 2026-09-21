import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  listAuditProjects,
  updateAuditProjectCi,
} from "@/modules/audit/project-service";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { getGitHubCheckRuns, getGitHubPullRequest } from "@/lib/github";

export const dynamic = "force-dynamic";

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
    if (!parsed.success) return NextResponse.json({ error: "Invalid status request." }, { status: 400 });

    const project = (await listAuditProjects(org.id)).find((item) => item.id === parsed.data.projectId);
    if (!project?.repository || !project.implementation) {
      return NextResponse.json({ error: "No implementation PR is connected to this project." }, { status: 409 });
    }

    const pr = await getGitHubPullRequest(
      project.repository.repositoryFullName,
      project.implementation.pullRequestNumber
    );

    if (pr.merged) {
      const updated = await updateAuditProjectCi({
        orgId: org.id,
        userId: user.id,
        projectId: project.id,
        status: "merged",
      });
      return NextResponse.json({ project: updated, github: pr });
    }

    const headSha = pr.head?.sha;
    if (!headSha) {
      return NextResponse.json({ error: "GitHub did not return the PR head commit." }, { status: 502 });
    }

    const checks = await getGitHubCheckRuns(project.repository.repositoryFullName, headSha);
    const runs = checks.check_runs ?? [];

    let status: "awaiting-ci" | "ci-passed" | "ci-failed" | "ready-for-client-review";
    if (!runs.length || runs.some((run) => run.status !== "completed")) {
      status = "awaiting-ci";
    } else if (
      runs.some((run) =>
        ["failure", "cancelled", "timed_out", "action_required", "stale"].includes(run.conclusion ?? "")
      )
    ) {
      status = "ci-failed";
    } else {
      status = pr.draft ? "ci-passed" : "ready-for-client-review";
    }

    const updated = await updateAuditProjectCi({
      orgId: org.id,
      userId: user.id,
      projectId: project.id,
      status,
    });

    return NextResponse.json({
      project: updated,
      github: {
        pullRequestNumber: pr.number,
        url: pr.html_url,
        draft: pr.draft,
        merged: pr.merged,
        checks: runs.map((run) => ({
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
        })),
      },
    });
  } catch (error) {
    console.error("[audit implementation sync]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync implementation status." },
      { status: 500 }
    );
  }
}
