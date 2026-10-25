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
            "create-files": ["ci_alpha.yml"],
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
