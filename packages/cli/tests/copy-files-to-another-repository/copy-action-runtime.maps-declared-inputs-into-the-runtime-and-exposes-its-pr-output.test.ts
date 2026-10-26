import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import {
  runCopyAction,
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

describe("action metadata to runtime contract", () => {
  it("maps declared inputs into the runtime and exposes its PR output", () => {
    const action = parse(
      readFileSync(
        new URL(
          "../../../actions/actions/copy-files-to-another-repository/action.yml",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const inputs: Record<string, string> = {
      token: options.token,
      "source-repository": options.sourceRepository,
      "source-ref": options.sourceRef,
      "source-directory": options.sourceDirectory,
      "destination-repository": options.repository,
      "destination-branch": options.branch,
      mode: "pull-request",
      "dry-run": "false",
      "commit-message": options.message,
    };
    for (const [env, value] of Object.entries(action.runs.steps[0].env)) {
      const input = String(value).match(/^\$\{\{ inputs\.([\w-]+) \}\}$/)?.[1];
      expect(input).toBeDefined();
      expect(action.inputs[input!]).toBeDefined();
      vi.stubEnv(env, inputs[input!]);
    }
    const output = join(root, "output");
    vi.stubEnv("GITHUB_OUTPUT", output);
    vi.stubEnv("GITHUB_STEP_SUMMARY", "");
    runCopyAction();
    expect(readFileSync(output, "utf8")).toContain(
      "pull-request-url=https://github.com/example/destination/pull/1",
    );
    expect(action.outputs["pull-request-url"].value).toBe(
      "${{ steps.copy.outputs.pull-request-url }}",
    );
  });
});
