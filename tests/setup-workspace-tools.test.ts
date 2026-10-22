import { describe, expect, test } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseWorkspaceToolsSource,
  resolveBinDir,
  validateBinDir,
} from "../packages/cli/src/setup-workspace-tools/setup-workspace-tools";
import { createSetupWorkspaceToolsCommand } from "../packages/cli/src/setup-workspace-tools/setup-workspace-tools-command";

describe("Workspace Tools source selection", () => {
  test("accepts latest, pinned versions, local and upstream refs", () => {
    expect(parseWorkspaceToolsSource("registry:npm:latest")).toEqual({
      mode: "registry",
      value: "latest",
      source: "registry:npm:latest",
    });
    expect(parseWorkspaceToolsSource("registry:npm:0.2.2").value).toBe("0.2.2");
    expect(parseWorkspaceToolsSource("checkout:current").mode).toBe("current");
    expect(
      parseWorkspaceToolsSource("checkout:upstream;branch:main").value,
    ).toBe("refs/heads/main");
    expect(
      parseWorkspaceToolsSource("checkout:upstream;tag:v1.0.0").value,
    ).toBe("refs/tags/v1.0.0");
    expect(
      parseWorkspaceToolsSource("checkout:upstream;sha:" + "a".repeat(40))
        .value,
    ).toBe("a".repeat(40));
  });
  test.each([
    "registry:npm:",
    "registry:npm:^1.0.0",
    "registry:npm:next",
    "checkout:upstream;branch:../bad",
    "checkout:upstream;sha:abc",
    "checkout:else",
    "",
  ])("rejects invalid source %s", (source) => {
    expect(() => parseWorkspaceToolsSource(source)).toThrow();
  });
  test("resolves CLI locations and rejects missing executables", () => {
    const root = mkdtempSync(join(tmpdir(), "workspace-tools-setup-"));
    try {
      const bin = join(root, "packages/workspace-tools/dist/bin");
      mkdirSync(bin, { recursive: true });
      writeFileSync(join(bin, "workspace-release.mjs"), "");
      writeFileSync(join(bin, "workspace-publish.mjs"), "");
      expect(
        resolveBinDir("current", { workspace: root, runnerTemp: root }),
      ).toBe(bin);
      expect(
        resolveBinDir("registry", {
          workspace: root,
          runnerTemp: root,
          releaseBin: join(bin, "workspace-release"),
        }),
      ).toBe(bin);
      validateBinDir(bin);
      expect(() => validateBinDir(join(root, "missing"))).toThrow(/missing/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  test("source Commander command writes GitHub outputs and rejects unknown options", async () => {
    const root = mkdtempSync(join(tmpdir(), "workspace-tools-setup-cli-"));
    try {
      const output = join(root, "outputs");
      await createSetupWorkspaceToolsCommand().parseAsync([
        "--workspace-tools-source",
        "registry:npm:latest",
        "--github-output",
        output,
      ], { from: "user" });
      expect(readFileSync(output, "utf8")).toContain(
        "mode=registry\\nvalue=latest",
      );
      const invalid = createSetupWorkspaceToolsCommand().exitOverride();
      await expect(invalid.parseAsync([
        "--workspace-tools-source", "registry:npm:latest", "--invalid",
      ], { from: "user" })).rejects.toMatchObject({
        code: "commander.unknownOption",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
