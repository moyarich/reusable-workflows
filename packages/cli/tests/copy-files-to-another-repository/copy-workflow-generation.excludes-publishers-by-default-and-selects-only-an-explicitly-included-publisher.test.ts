import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateWorkflows } from "../../src/copy-files-to-another-repository/generate";
describe("TypeScript copier generation", () => {
  it("excludes publishers by default and selects only an explicitly included publisher", () => {
    const root = mkdtempSync(join(tmpdir(), "copier-publish-"));
    const sourceRoot = join(root, "canonical");
    const output = join(root, "out");
    const directory = join(sourceRoot, ".github/workflows");
    mkdirSync(directory, { recursive: true });
    try {
      for (const name of [
        "ci_cli.yml",
        "publish.yml",
        "publish-vscode-vsx.yml",
        "publish-browser-extension.yml",
      ]) {
        writeFileSync(join(directory, name), "name: Example\\n");
      }
      const config = {
        source: { directory: ".github/workflows", allow: ["*.yml"] },
        defaults: { include: ["*.yml"], exclude: ["publish*.yml"] },
        repositories: [
          { name: "moyarich/none", branch: "main" },
          {
            name: "moyarich/vscode",
            branch: "main",
            include: ["publish-vscode-vsx.yml"],
          },
          {
            name: "moyarich/browser",
            branch: "main",
            include: ["publish-browser-extension.yml"],
          },
        ],
      };
      const run = (repository: string) =>
        generateWorkflows({ config, repository, sourceRoot, output });
      expect(run("moyarich/none")).toEqual([".github/workflows/ci_cli.yml"]);
      expect(run("moyarich/vscode")).toEqual([
        ".github/workflows/ci_cli.yml",
        ".github/workflows/publish-vscode-vsx.yml",
      ]);
      expect(run("moyarich/browser")).toEqual([
        ".github/workflows/ci_cli.yml",
        ".github/workflows/publish-browser-extension.yml",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
