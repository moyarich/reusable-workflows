import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  lstatSync,
  appendFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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
}
export function validateOptions(o: CopyOptions): void {
  if (!/^[\\w.-]+\/[\\w.-]+$/.test(o.sourceRepository) || o.sourceRepository.split("/").some((part) => part === "." || part === ".."))
    throw new Error("Invalid source repository");
  if (!/^[\\w.-][\\w./-]*$/.test(o.sourceRef) || o.sourceRef.includes("..") || o.sourceRef.includes("//"))
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
} {
  validateOptions(options);
  const temp = mkdtempSync(join(tmpdir(), "copy-repository-"));
  const destination = join(temp, "destination");
  const auth =
    "AUTHORIZATION: basic " +
    Buffer.from("x-access-token:" + options.token).toString("base64");
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: destination,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
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
    for (const name of readdirSync(options.sourceDirectory)) {
      if (name === ".git") throw new Error("Refusing to copy .git");
      if (lstatSync(resolve(options.sourceDirectory, name)).isSymbolicLink())
        throw new Error("Refusing symbolic-link source: " + name);
      cpSync(resolve(options.sourceDirectory, name), join(destination, name), {
        recursive: true,
        force: true,
        dereference: false,
      });
    }
    git("add", "-A");
    const changed = git("diff", "--cached", "--name-only").trim().length > 0;
    const summary = changed ? git("diff", "--cached", "--stat") : "No changes";
    if (!changed || options.dryRun)
      return { changed, committed: false, summary };
    git("config", "user.name", "github-actions[bot]");
    git(
      "config",
      "user.email",
      "41898282+github-actions[bot]@users.noreply.github.com",
    );
    git("commit", "-m", options.message);
    git(
      "-c",
      "http.extraheader=" + auth,
      "push",
      "origin",
      "HEAD:" + options.branch,
    );
    return { changed: true, committed: true, summary };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
function main(): void {
  const dryRun = process.env.COPY_DRY_RUN ?? "true";
  if (dryRun !== "true" && dryRun !== "false")
    throw new Error("dry-run must be true or false");
  const result = copyFiles({
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
      "changed=" + result.changed + "\ncommitted=" + result.committed + "\n",
    );
  }
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      "### " +
        process.env.COPY_DEST +
        "\n\`\`\`\n" +
        result.summary +
        "\n\`\`\`\n",
    );
}
if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + resolve(process.argv[1])).href
)
  main();
