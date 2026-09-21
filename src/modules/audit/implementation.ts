import type { FixPack } from "@/modules/audit/fix-engine";

export type RepositoryProvider = "github";
export type ImplementationMode = "pull_request";

export type ImplementationPlan = {
  mode: ImplementationMode;
  provider: RepositoryProvider;
  branchName: string;
  commitMessage: string;
  pullRequestTitle: string;
  files: Array<{
    path: string;
    reason: string;
    changes: string[];
  }>;
  tests: string[];
  deploymentRule: "client-ci-cd";
};

export function buildImplementationPlan(
  domain: string,
  fixPack: FixPack,
  targetPaths: string[] = ["app/page.tsx", "app/layout.tsx"]
): ImplementationPlan {
  const actions = fixPack.priorityActions.slice(0, 6);

  return {
    mode: "pull_request",
    provider: "github",
    branchName: `nahalabs/fix-${domain.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    commitMessage: `fix: improve conversion path for ${domain}`,
    pullRequestTitle: `NahaLabs Fix Pack: improve conversion path for ${domain}`,
    files: targetPaths.map((path) => ({
      path,
      reason: "Apply approved Revenue Leak Fix Pack changes without taking over client deployment.",
      changes: actions.map((action) => action.action),
    })),
    tests: [
      ...fixPack.acceptanceTests,
      "Run the repository's existing typecheck, lint and production build before opening the PR.",
      "Do not merge or deploy automatically; the client team owns final approval and deployment.",
    ],
    deploymentRule: "client-ci-cd",
  };
}
