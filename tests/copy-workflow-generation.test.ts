import { describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { generateWorkflows } from "../packages/cli/src/copy-files-to-another-repository/generate";

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
        source: { directory: ".github/workflows", include: ["*.yml"] },
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
  include: ["*.yml"]
repositories:
  - name: moyarich/editor
    profile: vscode
    <<: *common
    branch: release
  - name: moyarich/browser
    profile: browser
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
      expect(run("moyarich/browser")).toEqual([]);
      expect(() =>
        generateWorkflows({
          config: {
            ...config,
            repositories: [{ name: "moyarich/bad", profile: "missing" }],
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

  it("preserves unmodified bytes, applies nested overrides and enforces opt-in", () => {
    const root = mkdtempSync(join(tmpdir(), "copier-ts-"));
    const source = join(root, "canonical");
    const output = join(root, "generated");
    mkdirSync(join(source, ".github/workflows"), { recursive: true });
    try {
      const filename = ".github/workflows/ci_alpha.yml";
      const text =
        "# keep comment\nname: Alpha\non:\n  push:\n    paths: [packages/**/package.json]\njobs:\n  test:\n    with:\n      enabled: true\n";
      writeFileSync(join(source, filename), text);
      writeFileSync(
        join(source, ".github/workflows/ci_other.yml"),
        "name: Other\n",
      );
      const config = {
        source: {
          directory: ".github/workflows",
          include: ["ci_*.yml"],
          exclude: [],
        },
        repositories: [
          {
            name: "moyarich/console",
            branch: "main",
          },
        ],
      };
      const base = {
        config,
        repository: "moyarich/console",
        sourceRoot: source,
        output,
      };
      expect(generateWorkflows({ ...base, existingFiles: [] })).toEqual([
        filename,
      ]);
      expect(readFileSync(join(output, filename), "utf8")).toBe(text);
      expect(existsSync(join(output, ".github/workflows/ci_other.yml"))).toBe(
        false,
      );
      config.repositories[0] = {
        ...config.repositories[0],
        overrides: {
          [filename]: { jobs: { test: { with: { enabled: false } } } },
        },
      } as (typeof config.repositories)[number];
      expect(generateWorkflows({ ...base, existingFiles: [] })).toEqual([
        filename,
      ]);
      const updated = readFileSync(join(output, filename), "utf8");
      expect(updated).toContain("# keep comment");
      expect(parse(updated).jobs.test.with.enabled).toBe(false);
      expect(() =>
        generateWorkflows({
          ...base,
          config: {
            ...config,
            repositories: [
              {
                ...config.repositories[0],
                overrides: { [filename]: { jobs: { missing: {} } } },
              },
            ],
          },
        }),
      ).toThrow("missing key");
      expect(() =>
        generateWorkflows({ ...base, workflow: "../bad.yml" }),
      ).toThrow("Invalid canonical");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
