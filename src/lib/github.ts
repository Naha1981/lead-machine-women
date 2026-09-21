import { Buffer } from "node:buffer";
import { createHmac, createSign, timingSafeEqual } from "node:crypto";

export type GitHubTreeEntry = {
  path: string;
  mode?: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url?: string;
};

export type GitHubRepository = {
  id: number;
  full_name: string;
  name: string;
  default_branch: string;
  private: boolean;
  html_url: string;
};

export type GitHubFile = {
  path: string;
  sha: string;
  content: string;
  encoding: string;
};

export type GitHubAppState = {
  orgId: string;
  userId: string;
  projectId: string;
  repositoryFullName: string;
  issuedAt: number;
};

export class GitHubNotConfiguredError extends Error {
  code = "GITHUB_NOT_CONFIGURED" as const;
  constructor(message = "GitHub App authorization is not configured on the server.") {
    super(message);
    this.name = "GitHubNotConfiguredError";
  }
}

export class GitHubApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

function getLegacyToken() {
  const token = process.env.GITHUB_BUILDER_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new GitHubNotConfiguredError(
      "Legacy GitHub access is not configured. Use the client GitHub App installation flow."
    );
  }
  return token;
}

function getAppConfig() {
  const appId = process.env.GITHUB_APP_ID;
  const appSlug = process.env.GITHUB_APP_SLUG;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const stateSecret = process.env.GITHUB_APP_STATE_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appId || !appSlug || !privateKey || !stateSecret || !appUrl) {
    throw new GitHubNotConfiguredError(
      "Set GITHUB_APP_ID, GITHUB_APP_SLUG, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_STATE_SECRET and NEXT_PUBLIC_APP_URL."
    );
  }

  return {
    appId,
    appSlug,
    privateKey: privateKey.replace(/\\n/g, "\n"),
    stateSecret,
    appUrl: appUrl.replace(/\/$/, ""),
  };
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function normalizeRepoFullName(value: string) {
  const repo = value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error("Use a GitHub repository in owner/name format.");
  }
  return repo;
}

export function isGitHubAppConfigured() {
  try {
    getAppConfig();
    return true;
  } catch {
    return false;
  }
}

export function createGitHubAppState(input: Omit<GitHubAppState, "issuedAt">) {
  const config = getAppConfig();
  const payload: GitHubAppState = { ...input, issuedAt: Math.floor(Date.now() / 1000) };
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", config.stateSecret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyGitHubAppState(value: string): GitHubAppState {
  const config = getAppConfig();
  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) throw new Error("Invalid GitHub authorization state.");

  const expected = createHmac("sha256", config.stateSecret)
    .update(encodedPayload)
    .digest("base64url");

  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(expected);
  if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) {
    throw new Error("Invalid GitHub authorization state.");
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as GitHubAppState;
  const age = Math.floor(Date.now() / 1000) - payload.issuedAt;
  if (!payload.orgId || !payload.userId || !payload.projectId || !payload.repositoryFullName || age < 0 || age > 600) {
    throw new Error("GitHub authorization state has expired or is incomplete.");
  }
  return payload;
}

export function createGitHubAppInstallUrl(state: string) {
  const config = getAppConfig();
  const params = new URLSearchParams({ state });
  return `https://github.com/apps/${encodeURIComponent(config.appSlug)}/installations/new?${params.toString()}`;
}

function createGitHubAppJwt() {
  const config = getAppConfig();
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      iat: now - 60,
      exp: now + 540,
      iss: Number(config.appId),
    })
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(config.privateKey, "base64url")}`;
}

async function githubRequest<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const token = accessToken ?? getLegacyToken();
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2026-03-10",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new GitHubApiError(
      response.status,
      body.slice(0, 500) || `GitHub request failed (${response.status})`
    );
  }

  return (await response.json()) as T;
}

export async function createGitHubInstallationToken(
  installationId: number,
  repositoryFullName: string
) {
  const repo = normalizeRepoFullName(repositoryFullName);
  const repositoryName = repo.split("/")[1];
  const token = await githubRequest<{ token: string }>(
    `/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      body: JSON.stringify({
        repositories: [repositoryName],
        permissions: {
          contents: "write",
          pull_requests: "write",
          actions: "read",
          metadata: "read",
        },
      }),
    },
    createGitHubAppJwt()
  );
  return token.token;
}

export function getGitHubAppRegistrationUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new GitHubNotConfiguredError("Set NEXT_PUBLIC_APP_URL before creating the GitHub App.");
  const params = new URLSearchParams();
  params.set("name", "NahaLabs Fix Engineer");
  params.set("description", "NahaLabs Revenue Leak Fix Engineer. Creates reviewable code changes only after explicit client repository authorization.");
  params.set("url", appUrl);
  params.set("public", "true");
  params.append("callback_urls[]", `${appUrl}/api/audit/projects/github/callback`);
  params.set("contents", "write");
  params.set("pull_requests", "write");
  params.set("actions", "read");
  return `https://github.com/settings/apps/new?${params.toString()}`;
}

export async function getGitHubRepository(
  repositoryFullName: string,
  accessToken?: string
): Promise<GitHubRepository> {
  const repo = normalizeRepoFullName(repositoryFullName);
  return githubRequest<GitHubRepository>(`/repos/${repo}`, {}, accessToken);
}

export async function getGitHubTree(
  repositoryFullName: string,
  ref: string,
  accessToken?: string
): Promise<GitHubTreeEntry[]> {
  const repo = normalizeRepoFullName(repositoryFullName);
  const encodedRef = encodeURIComponent(ref);
  const result = await githubRequest<{
    tree?: GitHubTreeEntry[];
    truncated?: boolean;
  }>(`/repos/${repo}/git/trees/${encodedRef}?recursive=1`, {}, accessToken);

  if (result.truncated) {
    throw new Error("GitHub returned a truncated repository tree. Choose a smaller project or inspect a narrower path.");
  }

  return result.tree ?? [];
}

export async function getGitHubFile(
  repositoryFullName: string,
  path: string,
  ref: string,
  accessToken?: string
): Promise<GitHubFile> {
  const repo = normalizeRepoFullName(repositoryFullName);
  const encodedPath = encodePath(path);
  const query = `?ref=${encodeURIComponent(ref)}`;
  const result = await githubRequest<{
    path: string;
    sha: string;
    content?: string;
    encoding?: string;
  }>(`/repos/${repo}/contents/${encodedPath}${query}`, {}, accessToken);

  if (!result.content) throw new Error(`GitHub returned no content for ${path}.`);
  const content =
    result.encoding === "base64"
      ? Buffer.from(result.content.replace(/\s/g, ""), "base64").toString("utf8")
      : result.content;

  return {
    path: result.path,
    sha: result.sha,
    content,
    encoding: result.encoding ?? "utf-8",
  };
}

export async function createGitHubBranch(
  repositoryFullName: string,
  branchName: string,
  baseRef: string,
  accessToken?: string
) {
  const repo = normalizeRepoFullName(repositoryFullName);
  const base = await githubRequest<{ object: { sha: string } }>(
    `/repos/${repo}/git/ref/heads/${encodeURIComponent(baseRef)}`,
    {},
    accessToken
  );
  return githubRequest<{ ref: string; object: { sha: string } }>(`/repos/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: base.object.sha,
    }),
  }, accessToken);
}

export async function updateGitHubFile(opts: {
  repositoryFullName: string;
  path: string;
  content: string;
  sha: string;
  branch: string;
  message: string;
  accessToken?: string;
}) {
  const repo = normalizeRepoFullName(opts.repositoryFullName);
  const encodedPath = encodePath(opts.path);
  return githubRequest<{ content?: { sha?: string }; commit?: { sha?: string } }>(
    `/repos/${repo}/contents/${encodedPath}`,
    {
      method: "PUT",
      body: JSON.stringify({
        message: opts.message,
        content: Buffer.from(opts.content, "utf8").toString("base64"),
        sha: opts.sha,
        branch: opts.branch,
      }),
    },
    opts.accessToken
  );
}

export async function createGitHubPullRequest(opts: {
  repositoryFullName: string;
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
  accessToken?: string;
}) {
  const repo = normalizeRepoFullName(opts.repositoryFullName);
  return githubRequest<{
    number: number;
    html_url: string;
    state: string;
    draft: boolean;
    head?: { sha?: string };
    base?: { ref?: string };
  }>(`/repos/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: opts.title,
      body: opts.body,
      head: opts.head,
      base: opts.base,
      draft: opts.draft ?? true,
    }),
  }, opts.accessToken);
}

export async function getGitHubPullRequest(
  repositoryFullName: string,
  pullNumber: number,
  accessToken?: string
) {
  const repo = normalizeRepoFullName(repositoryFullName);
  return githubRequest<{
    number: number;
    html_url: string;
    state: string;
    draft: boolean;
    merged: boolean;
    mergeable?: boolean | null;
    head?: { sha?: string; ref?: string };
    base?: { ref?: string };
  }>(`/repos/${repo}/pulls/${pullNumber}`, {}, accessToken);
}

export async function getGitHubCheckRuns(
  repositoryFullName: string,
  commitSha: string,
  accessToken?: string
) {
  const repo = normalizeRepoFullName(repositoryFullName);
  return githubRequest<{
    total_count: number;
    check_runs: Array<{
      name: string;
      status: "queued" | "in_progress" | "completed" | string;
      conclusion?: string | null;
    }>;
  }>(`/repos/${repo}/commits/${commitSha}/check-runs`, {}, accessToken);
}

export function isSafeImplementationPath(path: string) {
  if (!path || path.startsWith("/") || path.includes("..")) return false;
  const lower = path.toLowerCase();
  if (
    lower.includes("node_modules/") ||
    lower.startsWith(".github/") ||
    lower.includes(".env") ||
    lower.endsWith(".lock") ||
    lower === "package.json" ||
    lower === "package-lock.json" ||
    lower === "bun.lockb"
  ) {
    return false;
  }
  return /\.(tsx|ts|jsx|js)$/.test(lower);
}
