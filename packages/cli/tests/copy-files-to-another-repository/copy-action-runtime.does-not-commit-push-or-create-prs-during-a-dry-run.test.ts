import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  copyFiles,
  type CopyOptions,
} from "../../src/copy-files-to-another-repository/index";
const subprocess = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ execFileSync: subprocess }));
let root: string;
let options: CopyOptions;
let changed: boolean;
let remoteBranch: boolean;
let openPr: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "copy-runtime-test-"));
  const source = join(root, "source");
  mkdirSync(source);
  writeFileSync(join(source, "workflow.yml"), "name: example\n");
  options = {
    sourceRepository: "example/source",
    sourceRef: "main",
    sourceDirectory: source,
    repository: "example/destination",
    branch: "main",
    token: "test-token",
    dryRun: false,
    message: "Sync workflows",
    mode: "pull-request",
  };
  changed = true;
  remoteBranch = false;
  openPr = "";
  subprocess.mockReset();
  subprocess.mockImplementation((command: string, args: string[]) => {
    if (command === "git") {
      if (args.includes("clone")) mkdirSync(args.at(-1)!, { recursive: true });
      if (args.includes("ls-remote"))
        return remoteBranch ? "abc refs/heads/existing\n" : "";
      if (args.includes("--name-only")) return changed ? "workflow.yml\n" : "";
      if (args.includes("--stat")) return "workflow.yml | 1 +\n";
      return "";
    }
    if (command === "gh" && args[1] === "list") return openPr;
    if (command === "gh" && args[1] === "create")
      return "https://github.com/example/destination/pull/1\n";
    throw new Error("Unexpected subprocess: " + command);
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});
const calls = (command: string) =>
  subprocess.mock.calls
    .filter(([file]) => file === command)
    .map(([, args]) => args as string[]);
const pushes = () => calls("git").filter((args) => args.includes("push"));
describe("copy action publication modes", () => {
  it("does not commit, push or create PRs during a dry run", () => {
    expect(copyFiles({ ...options, dryRun: true }).committed).toBe(false);
    expect(pushes()).toHaveLength(0);
    expect(calls("git").some((args) => args.includes("commit"))).toBe(false);
    expect(calls("gh")).toHaveLength(0);
  });
  it("reports an existing PR title and link during dry-run without writes", () => {
    remoteBranch = true;
    openPr = JSON.stringify({
      url: "https://github.com/example/destination/pull/29",
      title: "Existing synchronization PR",
    });
    const result = copyFiles({ ...options, dryRun: true });
    expect(result).toMatchObject({
      committed: false,
      pullRequestUrl: "https://github.com/example/destination/pull/29",
      pullRequestTitle: "Existing synchronization PR",
      pullRequestStatus: "existing",
    });
    expect(pushes()).toHaveLength(0);
    expect(calls("git").some((args) => args.includes("commit"))).toBe(false);
  });
  it("updates the existing pull request branch instead of creating another PR", () => {
    remoteBranch = true;
    openPr = JSON.stringify({
      url: "https://github.com/example/destination/pull/29",
      title: "Existing synchronization PR",
    });
    const result = copyFiles(options);
    expect(result).toMatchObject({
      committed: true,
      pullRequestStatus: "existing",
      pullRequestTitle: "Existing synchronization PR",
    });
    expect(pushes()).toHaveLength(1);
    expect(pushes()[0].some((arg) =>
      /^--force-with-lease=refs\/heads\/automation\/copy-workflows-[a-f0-9]{16}:abc$/.test(arg),
    )).toBe(true);
    expect(calls("git").some((args) => args.includes("fetch"))).toBe(false);
    expect(calls("gh").some((args) => args.includes("create"))).toBe(false);
  });
});
