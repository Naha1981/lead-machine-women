import { NextResponse } from "next/server";
import {
  createGitHubInstallationToken,
  getGitHubRepository,
  verifyGitHubAppState,
} from "@/lib/github";
import { connectAuditProjectRepository, listAuditProjects } from "@/modules/audit/project-service";

export const dynamic = "force-dynamic";

function redirectWithStatus(requestUrl: string, status: string, projectId?: string) {
  const origin = new URL(requestUrl).origin;
  const params = new URLSearchParams({ github: status });
  if (projectId) params.set("projectId", projectId);
  return NextResponse.redirect(origin + "/?" + params.toString(), 303);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const installationIdRaw = url.searchParams.get("installation_id");
  const setupAction = url.searchParams.get("setup_action");

  if (!state || !installationIdRaw) {
    return redirectWithStatus(req.url, "missing");
  }

  try {
    const context = verifyGitHubAppState(state);
    const installationId = Number(installationIdRaw);
    if (!Number.isInteger(installationId) || installationId <= 0) {
      throw new Error("Invalid GitHub installation.");
    }
    if (setupAction === "cancel") {
      return redirectWithStatus(req.url, "cancelled", context.projectId);
    }

    const installationToken = await createGitHubInstallationToken(
      installationId,
      context.repositoryFullName
    );

    const repo = await getGitHubRepository(context.repositoryFullName, installationToken);
    if (repo.full_name.toLowerCase() !== context.repositoryFullName.toLowerCase()) {
      throw new Error("GitHub authorized a different repository than the one requested.");
    }

    const projects = await listAuditProjects(context.orgId);
    const project = projects.find((item) => item.id === context.projectId);
    if (!project) throw new Error("Fix project no longer exists.");
    if (project.status !== "approved") {
      throw new Error("The Fix Pack must remain approved while GitHub authorization is completed.");
    }

    await connectAuditProjectRepository({
      orgId: context.orgId,
      userId: context.userId,
      projectId: context.projectId,
      repository: {
        provider: "github-app",
        repositoryFullName: repo.full_name,
        repositoryId: repo.id,
        installationId,
        baseBranch: repo.default_branch,
        connectedAt: new Date().toISOString(),
      },
    });

    return redirectWithStatus(req.url, "connected", context.projectId);
  } catch (error) {
    console.error("[audit github authorization callback]", error);
    return redirectWithStatus(req.url, "error");
  }
}
