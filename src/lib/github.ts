import { Buffer } from "node:buffer";

export type GitHubTreeEntry = {
  path: string;
  mode?: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url?: string;
};

export type GitHubRepository = {
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

export class GitHubNotConfiguredError extends Error {
  code = "GITHUB_NOT_CONFIGURED" as const;
  constructor() {
    super("GitHub builder access is not configured. Set GITHUB_TOKEN on the server.");
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

function getToken() {
  const token = process.env.GITHUB_BUILDER_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new GitHubNotConfiguredError();
  return token;
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function githubRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
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

export function normalizeRepoFullName(value: string) {
  const repo = value.trim().replace(/^https?:\\/\\/github\\.com\\//, "").replace(/\\.git$/, "");
  if (!/^[A-Za-z0-9_.-]+\\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error("Use a GitHub repository in owner/name format.");
  }
  return repo;
}

export async function getGitHubRepository(
  repositoryFullName: string
): Promise<GitHubRepository> {
  const repo = normalizeRepoFullName(repositoryFullName);
  return githubRequest<GitHubRepository>(`/repos/${repo}`);
}

export async function getGitHubTree(
  repositoryFullName: string,
  ref: string
): Promise<GitHubTreeEntry[]> {
  const repo = normalizeRepoFullName(repositoryFullName);
  const encodedRef = encodeURIComponent(ref);
  const result = await githubRequest<{
    tree?: GitHubTreeEntry[];
    truncated?: boolean;
  }>(`/repos/${repo}/git/trees/${encodedRef}?recursive=1`);

  if (result.truncated) {
    throw new Error("GitHub returned a truncated repository tree. Choose a smaller project or inspect a narrower path.");
  }

  return result.tree ?? [];
}

export async function getGitHubFile(
  repositoryFullName: string,
  path: string,
  ref: string
): Promise<GitHubFile> {
  const repo = normalizeRepoFullName(repositoryFullName);
  const encodedPath = encodePath(path);
  const query = `?ref=${encodeURIComponent(ref)}`;
  const result = await githubRequest<{
    path: string;
    sha: string;
    content?: string;
    encoding?: string;
  }>(`/repos/${repo}/contents/${encodedPath}${query}`);

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
  baseRef: string
) {
  const repo = normalizeRepoFullName(repositoryFullName);
  const base = await githubRequest<{ object: { sha: string } }>(
    `/repos/${repo}/git/ref/heads/${encodeURIComponent(baseRef)}`
  );
  return githubRequest<{ ref: string; object: { sha: string } }>(`/repos/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: base.object.sha,
    }),
  });
}

export async function updateGitHubFile(opts: {
  repositoryFullName: string;
  path: string;
  content: string;
  sha: string;
  branch: string;
  message: string;
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
    }
  );
}

export async function createGitHubPullRequest(opts: {
  repositoryFullName: string;
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
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
  });
}

export async function getGitHubPullRequest(
  repositoryFullName: string,
  pullNumber: number
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
  }>(`/repos/${repo}/pulls/${pullNumber}`);
}

export async function getGitHubCheckRuns(
  repositoryFullName: string,
  commitSha: string
) {
  const repo = normalizeRepoFullName(repositoryFullName);
  return githubRequest<{
    total_count: number;
    check_runs: Array<{
      name: string;
      status: "queued" | "in_progress" | "completed" | string;
      conclusion?: string | null;
    }>;
  }>(`/repos/${repo}/commits/${commitSha}/check-runs`);
}

export async function getGitHubBranchSha(
  repositoryFullName: string,
  branchName: string
) {
  const repo = normalizeRepoFullName(repositoryFullName);
  const result = await githubRequest<{ object: { sha: string } }>(
    `/repos/${repo}/git/ref/heads/${encodeURIComponent(branchName)}`
  );
  return result.object.sha;
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
