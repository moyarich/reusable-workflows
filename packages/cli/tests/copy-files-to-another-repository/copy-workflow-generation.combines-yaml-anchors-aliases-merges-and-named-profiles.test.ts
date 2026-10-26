import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { generateWorkflows } from "../../src/copy-files-to-another-repository/generate";
describe("TypeScript copier generation", () => {
  it("combines YAML anchors, aliases, merges and named profiles", () => {
    const root = mkdtempSync(join(tmpdir(), "copier-merged-"));
    const sourceRoot = join(root, "source");
    const output = join(root, "output");
    const directory = join(sourceRoot, ".github/workflows");
    mkdirSync(directory, { recursive: true });
    try {
      for (const name of [
        "ci_cli.yml",
        "publish-vscode-vsx.yml",
        "publish-browser-extension.yml",
      ]) {
        writeFileSync(join(directory, name), "name: Sample\n");
      }
      const config = parse(
        `
defaults:
  branch: main
  include: ["*.yml"]
  exclude: [publish*.yml]
profiles:
  vscode:
    include: [publish-vscode-vsx.yml]
  browser:
    include: [publish-browser-extension.yml]
shared: &common
  branch: develop
  exclude: [ci_cli.yml]
source:
  directory: .github/workflows
  allow: ["*.yml"]
repositories:
  - name: moyarich/editor
    profiles: [vscode]
    <<: *common
    branch: release
  - name: moyarich/browser
    profiles: [browser]
    exclude: [publish-browser-extension.yml]
`,
        { merge: true },
      );
      const run = (repository: string) =>
        generateWorkflows({
          config,
          repository,
          sourceRoot,
          output,
          existingFiles: [],
        });
      expect(config.repositories[0].branch).toBe("release");
      expect(config.repositories[0].exclude).toEqual(["ci_cli.yml"]);
      expect(run("moyarich/editor")).toEqual([
        ".github/workflows/publish-vscode-vsx.yml",
      ]);
      expect(run("moyarich/browser")).toEqual([".github/workflows/ci_cli.yml"]);
      expect(() =>
        generateWorkflows({
          config: {
            ...config,
            repositories: [
              { name: "moyarich/multi", profiles: ["vscode", "browser"] },
            ],
          },
          repository: "moyarich/multi",
          sourceRoot,
          output,
        }),
      ).not.toThrow();
      expect(() =>
        generateWorkflows({
          config: {
            ...config,
            repositories: [{ name: "moyarich/bad", profiles: ["missing"] }],
          },
          repository: "moyarich/bad",
          sourceRoot,
          output,
        }),
      ).toThrow("Unknown copier profile");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
