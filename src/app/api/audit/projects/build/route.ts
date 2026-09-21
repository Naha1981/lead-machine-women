import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  listAuditProjects,
  recordAuditProjectImplementation,
} from "@/modules/audit/project-service";
import {
  createGitHubBranch,
  createGitHubPullRequest,
  getGitHubFile,
  getGitHubTree,
  isSafeImplementationPath,
  updateGitHubFile,
} from "@/lib/github";
import { getOrCreateUserByClerkId, getOwnedOrgForUser } from "@/modules/auth/service";
import { generateImplementationPatch } from "@/modules/audit/ai-implementation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  projectId: z.string().uuid(),
});

const CANDIDATE_PRIORITY = [
  "src/app/page.tsx",
  "app/page.tsx",
  "src/app/layout.tsx",
  "app/layout.tsx",
  "pages/index.tsx",
  "src/pages/index.tsx",
  "src/pages/_app.tsx",
  "pages/_app.tsx",
];

function pickCandidatePaths(paths: string[]) {
  const priority = CANDIDATE_PRIORITY.filter((path) => paths.includes(path));
  if (priority.length) return priority.slice(0, 3);

  return paths
    .filter((path) => /\.(tsx|jsx|ts|js)$/.test(path))
    .filter(isSafeImplementationPath)
    .filter((path) => !/(test|spec|storybook|stories)/i.test(path))
    .sort((a, b) => {
      const aScore = /page|home|landing|contact|header|hero/i.test(a) ? 0 : 1;
      const bScore = /page|home|landing|contact|header|hero/i.test(b) ? 0 : 1;
      return aScore - bScore || a.length - b.length;
    })
    .slice(0, 3);
}

function buildBranchName(projectId: string, domain: string) {
  const slug = domain.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-+|-+$/g, "").slice(0, 48);
  return `nahalabs/fix-${slug || "website"}-${projectId.slice(0, 8)}`;
}

function importSpecifiers(content: string) {
  return [...content.matchAll(/^\s*import\s+(?:type\s+)?(?:.+?\s+from\s+)?["']([^"']+)["'];?/gm)]
    .map((match) => match[1])
    .filter(Boolean);
}

function validateGeneratedPatch(
  originalByPath: Map<string, string>,
  patch: { path: string; content: string }[]
) {
  if (patch.length > 3) return "The implementation is limited to three files per reviewable PR.";

  const forbidden = [
    "child_process",
    "node:fs",
    "node:net",
    "node:dns",
    "process.env",
    "eval(",
    "new Function(",
    "require(",
    "dangerouslySetInnerHTML",
  ];

  for (const item of patch) {
    const original = originalByPath.get(item.path);
    if (!original) return `No original source snapshot exists for ${item.path}.`;

    const originalLines = original.split("\n").filter((line) => line.trim().length > 0);
    const anchors = originalLines.slice(0, 2).filter((line) => line.trim().length > 12);
    if (anchors.some((line) => !item.content.includes(line.trim()))) {
      return `The generated rewrite for ${item.path} is too different from the authorised source.`;
    }

    if (item.content.length < Math.max(200, Math.round(original.length * 0.25))) {
      return `The generated rewrite for ${item.path} is unexpectedly small.`;
    }
    if (item.content.length > Math.round(original.length * 2)) {
      return `The generated rewrite for ${item.path} is unexpectedly large.`;
    }

    for (const token of forbidden) {
      if (item.content.includes(token) && !original.includes(token)) {
        return `The generated patch introduced a blocked operation: ${token}`;
      }
    }

    const originalImports = new Set(importSpecifiers(original));
    const newImports = importSpecifiers(item.content);
    for (const specifier of newImports) {
      if (!originalImports.has(specifier) && !specifier.startsWith(".") && !specifier.startsWith("@/")) {
        return `The generated patch introduced a new external import: ${specifier}`;
      }
    }
  }

  return null;
}

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
    if (!parsed.success) return NextResponse.json({ error: "Invalid build request." }, { status: 400 });

    const project = (await listAuditProjects(org.id)).find((item) => item.id === parsed.data.projectId);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (project.status !== "approved") {
      return NextResponse.json({ error: "Approve the Fix Pack before building." }, { status: 409 });
    }
    if (!project.repository) {
      return NextResponse.json({ error: "Connect the authorised GitHub repository first." }, { status: 409 });
    }

    const tree = await getGitHubTree(project.repository.repositoryFullName, project.repository.baseBranch);
    const paths = tree
      .filter((item) => item.type === "blob")
      .map((item) => item.path)
      .filter(isSafeImplementationPath);

    const candidatePaths = pickCandidatePaths(paths);
    if (!candidatePaths.length) {
      return NextResponse.json(
        { error: "Could not identify safe web source files to patch. Review the repository structure with the client team." },
        { status: 422 }
      );
    }

    const fileContexts = [];
    for (const path of candidatePaths) {
      const file = await getGitHubFile(project.repository.repositoryFullName, path, project.repository.baseBranch);
      if (file.content.length > 100_000) continue;
      fileContexts.push({ path, content: file.content });
    }

    if (!fileContexts.length) {
      return NextResponse.json({ error: "The candidate source files are too large to safely inspect." }, { status: 422 });
    }

    const patch = await generateImplementationPatch({
      domain: project.audit.domain,
      fixPack: project.fixPack,
      files: fileContexts,
    });

    const allowedPaths = new Set(fileContexts.map((file) => file.path));
    if (
      patch.patches.some(
        (item) =>
          !allowedPaths.has(item.path) ||
          !isSafeImplementationPath(item.path) ||
          item.content.length > 120_000
      )
    ) {
      return NextResponse.json({ error: "The generated patch touched a file outside the authorised implementation boundary." }, { status: 422 });
    }

    const originalByPath = new Map(fileContexts.map((file) => [file.path, file.content]));
    const safetyError = validateGeneratedPatch(originalByPath, patch.patches);
    if (safetyError) {
      return NextResponse.json({ error: safetyError }, { status: 422 });
    }

    const branchName = buildBranchName(project.id, project.audit.domain);
    try {
      await createGitHubBranch(
        project.repository.repositoryFullName,
        branchName,
        project.repository.baseBranch
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/already exists|Reference already exists|422/i.test(message)) throw error;
    }

    for (const item of patch.patches) {
      const current = await getGitHubFile(
        project.repository.repositoryFullName,
        item.path,
        branchName
      );
      await updateGitHubFile({
        repositoryFullName: project.repository.repositoryFullName,
        path: item.path,
        content: item.content,
        sha: current.sha,
        branch: branchName,
        message: `fix: apply Revenue Leak Fix Pack to ${item.path}`,
      });
    }

    const pullRequest = await createGitHubPullRequest({
      repositoryFullName: project.repository.repositoryFullName,
      title: `NahaLabs Fix Pack: ${project.audit.domain}`,
      body: [
        "## NahaLabs Revenue Leak Fix Pack",
        "",
        "This is a client-controlled implementation PR generated only after the repository was explicitly authorised.",
        "",
        `**Before audit score:** ${project.audit.score}`,
        `**Approved actions:** ${project.fixPack.priorityActions.length}`,
        `**Files changed:** ${patch.patches.map((item) => item.path).join(", ")}`,
        "",
        "### Acceptance tests",
        ...project.fixPack.acceptanceTests.map((test) => `- ${test}`),
        "",
        "### Safety boundary",
        "- NahaLabs does not merge this PR.",
        "- NahaLabs does not deploy this project.",
        "- Client engineering owns review, merge and deployment.",
        "- The project should be re-audited after the client deployment.",
      ].join("\n"),
      head: branchName,
      base: project.repository.baseBranch,
      draft: true,
    });

    const implementation = {
      branchName,
      pullRequestNumber: pullRequest.number,
      pullRequestUrl: pullRequest.html_url,
      status: "awaiting-ci" as const,
      changedFiles: patch.patches.map((item) => item.path),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const next = await recordAuditProjectImplementation({
      orgId: org.id,
      userId: user.id,
      projectId: project.id,
      implementation,
    });

    return NextResponse.json({
      project: next,
      patch: {
        summary: patch.summary,
        files: patch.patches.map((item) => ({
          path: item.path,
          changeSummary: item.changeSummary,
        })),
      },
      pullRequest: {
        number: pullRequest.number,
        url: pullRequest.html_url,
        draft: pullRequest.draft,
      },
    });
  } catch (error) {
    console.error("[audit build]", error);
    const message = error instanceof Error ? error.message : "Could not build the implementation PR.";
    const status = /not configured|Unauthorized/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
