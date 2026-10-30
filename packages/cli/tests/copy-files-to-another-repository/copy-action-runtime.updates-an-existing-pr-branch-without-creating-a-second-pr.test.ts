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
let matchingPrs: string;
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
  openPr = "{}";
  matchingPrs = "[]";
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
    if (command === "gh" && args[1] === "list")
      return args.includes("--head") ? openPr : matchingPrs;
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
  it("reuses a matching open PR on a previously suffixed branch", () => {
    matchingPrs = JSON.stringify([
      {
        number: 10,
        url: "https://github.com/example/destination/pull/10",
        title: "Sync workflows",
        headRefName: "automation/copy-workflows-old-1234",
        body: "Synchronize prepared files from example/source at main.",
      },
      {
        number: 11,
        url: "https://github.com/example/destination/pull/11",
        title: "Unrelated",
        headRefName: "automation/copy-workflows-other",
        body: "Synchronize prepared files from other/source at main.",
      },
    ]);
    remoteBranch = true;
    const result = copyFiles(options);
    expect(result.pullRequestUrl).toBe(
      "https://github.com/example/destination/pull/10",
    );
    expect(result.pullRequestStatus).toBe("existing");
    expect(pushes()[0]).toContain(
      "--force-with-lease=refs/heads/automation/copy-workflows-old-1234:abc",
    );
    expect(calls("gh").some((args) => args[1] === "create")).toBe(false);
  });
  it("updates an existing PR branch without creating a second PR", () => {
    remoteBranch = true;
    openPr = JSON.stringify({
      url: "https://github.com/example/destination/pull/4",
      title: "Sync workflows",
    });
    expect(copyFiles(options).pullRequestUrl).toBe(
      "https://github.com/example/destination/pull/4",
    );
    expect(pushes()).toHaveLength(1);
    expect(calls("gh").some((args) => args[1] === "create")).toBe(false);
  });
});
