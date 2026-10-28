import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  lstatSync,
  appendFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

export interface CopyOptions {
  sourceRepository: string;
  sourceRef: string;
  sourceDirectory: string;
  repository: string;
  branch: string;
  token: string;
  dryRun: boolean;
  message: string;
  mode?: "pull-request" | "update-branch";
}
export function validateOptions(o: CopyOptions): void {
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(o.sourceRepository) ||
    o.sourceRepository.split("/").some((part) => part === "." || part === "..")
  )
    throw new Error("Invalid source repository");
  if (
    !/^[\w.-][\w./-]*$/.test(o.sourceRef) ||
    o.sourceRef.includes("..") ||
    o.sourceRef.includes("//")
  )
    throw new Error("Invalid source ref");
  const parts = o.repository.split("/");
  if (
    parts.length !== 2 ||
    parts.some((part) => !part || part === "." || part === "..") ||
    !/^[\w.-]+\/[\w.-]+$/.test(o.repository)
  )
    throw new Error("Invalid repository");
  if (
    !/^[\w.-][\w./-]*$/.test(o.branch) ||
    o.branch.includes("..") ||
    o.branch.includes("//")
  )
    throw new Error("Invalid branch");
  if (
    o.mode !== undefined &&
    !["pull-request", "update-branch"].includes(o.mode)
  )
    throw new Error("Invalid copy mode");
  if (!o.token) throw new Error("Destination token is required");
  if (
    !existsSync(o.sourceDirectory) ||
    !statSync(o.sourceDirectory).isDirectory()
  )
    throw new Error("Source directory not found");
  if (!readdirSync(o.sourceDirectory).length)
    throw new Error("Source directory is empty");
}
export function copyFiles(options: CopyOptions): {
  changed: boolean;
  committed: boolean;
  summary: string;
  pullRequestUrl?: string;
  pullRequestTitle?: string;
  pullRequestStatus?: "existing" | "created";
} {
  validateOptions(options);
  const temp = mkdtempSync(join(tmpdir(), "copy-repository-"));
  const destination = join(temp, "destination");
  const auth =
    "AUTHORIZATION: basic " +
    Buffer.from("x-access-token:" + options.token).toString("base64");
  const mode = options.mode ?? "pull-request";
  let pullRequestBranch =
    "automation/copy-workflows-" +
    createHash("sha256")
      .update(
        JSON.stringify([
          options.sourceRepository,
          options.sourceRef,
          options.branch,
        ]),
      )
      .digest("hex")
      .slice(0, 16);
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: destination,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  const authenticatedGit = (...args: string[]) =>
    git("-c", "http.extraheader=" + auth, ...args);
  const github = (...args: string[]) =>
    execFileSync("gh", args, {
      cwd: destination,
      encoding: "utf8",
      env: { ...process.env, GH_TOKEN: options.token },
      stdio: ["ignore", "pipe", "pipe"],
    });
  const existingPullRequest = (): { url?: string; title?: string } =>
    JSON.parse(
      github(
        "pr",
        "list",
        "--repo",
        options.repository,
        "--base",
        options.branch,
        "--head",
        pullRequestBranch,
        "--state",
        "open",
        "--json",
        "url,title",
        "--jq",
        ".[0] // {}",
      ).trim(),
    );
  try {
    execFileSync(
      "git",
      [
        "-c",
        "http.extraheader=" + auth,
        "clone",
        "--depth",
        "1",
        "--branch",
        options.branch,
        "https://github.com/" + options.repository + ".git",
        destination,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let existingBranch = false;
    let existingBranchSha: string | undefined;
    let pullRequestUrl: string | undefined;
    let pullRequestTitle: string | undefined;
    let pullRequestStatus: "existing" | "created" | undefined;
    if (mode === "pull-request") {
      existingBranchSha = authenticatedGit(
        "ls-remote", "--heads", "origin", "refs/heads/" + pullRequestBranch,
      ).trim().split(/\s+/)[0] || undefined;
      existingBranch = Boolean(existingBranchSha);
      if (existingBranch) {
        const existing = existingPullRequest();
        pullRequestUrl = existing.url;
        pullRequestTitle = existing.title;
        if (pullRequestUrl) pullRequestStatus = "existing";
        if (!pullRequestUrl) {
          // A retained branch from a merged or closed PR must not be reused.
          pullRequestBranch += "-" + randomUUID().slice(0, 8);
          existingBranch = false;
        }
      }
      // Reconstruct from the freshly cloned base to avoid stale PR history,
      // unrelated bot commits, and conflicts after the destination advances.
      git("checkout", "-b", pullRequestBranch);
    }
    for (const name of readdirSync(options.sourceDirectory)) {
      if (name === ".git") throw new Error("Refusing to copy .git");
      if (lstatSync(resolve(options.sourceDirectory, name)).isSymbolicLink())
        throw new Error("Refusing symbolic-link source: " + name);
      const target = join(destination, name);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(resolve(options.sourceDirectory, name), target, {
        recursive: true,
        force: true,
        dereference: false,
      });
    }
    git("add", "-A");
    const changed = git("diff", "--cached", "--name-only").trim().length > 0;
    const summary = changed ? git("diff", "--cached", "--stat") : "No changes";
    if (options.dryRun)
      return {
        changed,
        committed: false,
        summary,
        pullRequestUrl,
        pullRequestTitle,
        pullRequestStatus,
      };
    if (!changed) {
      return {
        changed,
        committed: false,
        summary,
        pullRequestUrl,
        pullRequestTitle,
        pullRequestStatus,
      };
    }
    git("config", "user.name", "github-actions[bot]");
    git(
      "config",
      "user.email",
      "41898282+github-actions[bot]@users.noreply.github.com",
    );
    git("commit", "-m", options.message);
    authenticatedGit(
      "push",
      ...(mode === "pull-request" && existingBranch && existingBranchSha
        ? [`--force-with-lease=refs/heads/${pullRequestBranch}:${existingBranchSha}`]
        : []),
      "origin",
      "HEAD:" + (mode === "pull-request" ? pullRequestBranch : options.branch),
    );
    pullRequestUrl =
      mode === "pull-request"
        ? pullRequestUrl ||
          github(
            "pr",
            "create",
            "--repo",
            options.repository,
            "--base",
            options.branch,
            "--head",
            pullRequestBranch,
            "--title",
            options.message,
            "--body",
            `Synchronize prepared files from ${options.sourceRepository} at ${options.sourceRef}.`,
          ).trim()
        : undefined;
    if (mode === "pull-request" && pullRequestStatus !== "existing") {
      pullRequestTitle = options.message;
      pullRequestStatus = "created";
    }
    return {
      changed: true,
      committed: true,
      summary,
      pullRequestUrl,
      pullRequestTitle,
      pullRequestStatus,
    };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
export function runCopyAction(): void {
  const dryRun = process.env.COPY_DRY_RUN ?? "true";
  if (dryRun !== "true" && dryRun !== "false")
    throw new Error("dry-run must be true or false");
  const result = copyFiles({
    mode: (process.env.COPY_MODE ?? "pull-request") as CopyOptions["mode"],
    sourceRepository: process.env.COPY_SOURCE_REPO ?? "",
    sourceRef: process.env.COPY_SOURCE_REF ?? "main",
    sourceDirectory: process.env.COPY_SOURCE ?? "",
    repository: process.env.COPY_DEST ?? "",
    branch: process.env.COPY_BRANCH ?? "main",
    token: process.env.COPY_TOKEN ?? "",
    dryRun: dryRun === "true",
    message: process.env.COPY_MESSAGE ?? "chore: synchronize repository files",
  });
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      "changed=" +
        result.changed +
        "\ncommitted=" +
        result.committed +
        "\npull-request-url=" +
        (result.pullRequestUrl ?? "") +
        "\npull-request-title=" +
        (result.pullRequestTitle ?? "") +
        "\npull-request-status=" +
        (result.pullRequestStatus ?? "") +
        "\n",
    );
  }
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      "### " +
        process.env.COPY_DEST +
        "\n" +
        (result.pullRequestUrl
          ? `PR: [${result.pullRequestTitle ?? "Existing pull request"}](${result.pullRequestUrl}) (${result.pullRequestStatus})\n\n`
          : "") +
        "```\n" +
        result.summary +
        "\n```\n",
    );
}
