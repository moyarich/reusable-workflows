import { describe, expect, it } from "vitest";
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
import { syncYamlValues } from "../../src/sync-yaml-values/sync-yaml-values";

describe("workflow choice synchronization", () => {
  it("creates missing option keys only when explicitly enabled", () => {
    const root = mkdtempSync(join(tmpdir(), "choice-sync-missing-"));
    const old = process.cwd();
    try {
      process.chdir(root);
      mkdirSync(".github/workflows", { recursive: true });
      const file = ".github/workflows/release.yml";
      writeFileSync(
        file,
        "on:\n  workflow_dispatch:\n    inputs:\n      package:\n        type: string\n",
      );
      const updates = [
        {
          path: ["on", "workflow_dispatch", "inputs", "package", "options"],
          value: ["all", "packages/core"],
        },
      ];
      expect(() => syncYamlValues({ file, updates })).toThrow(
        "Missing YAML property",
      );
      expect(() =>
        syncYamlValues({ file, updates, check: true, createMissing: true }),
      ).toThrow("out of sync");
      expect(syncYamlValues({ file, updates, createMissing: true })).toBe(true);
      expect(
        parse(readFileSync(file, "utf8")).on.workflow_dispatch.inputs.package
          .options,
      ).toEqual(["all", "packages/core"]);
      expect(syncYamlValues({ file, updates, createMissing: true })).toBe(
        false,
      );
    } finally {
      process.chdir(old);
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("updates dispatch options, preserves other settings, and is idempotent", () => {
    const root = mkdtempSync(join(tmpdir(), "choice-sync-"));
    const old = process.cwd();
    try {
      process.chdir(root);
      mkdirSync(".github/workflows", { recursive: true });
      const file = ".github/workflows/copy.yml";
      writeFileSync(
        file,
        "name: Copy\non:\n  workflow_dispatch:\n    inputs:\n      repository:\n        description: Choose target\n        type: choice\n        default: all\n        options: [all, old]\n      dry-run:\n        type: boolean\n        default: true\n",
      );
      const options = {
        file,
        updates: [
          {
            path: [
              "on",
              "workflow_dispatch",
              "inputs",
              "repository",
              "options",
            ],
            value: ["all", "moyarich/console"],
          },
        ],
      };
      expect(() => syncYamlValues({ ...options, check: true })).toThrow(
        "out of sync",
      );
      expect(syncYamlValues(options)).toBe(true);
      const document = parse(readFileSync(file, "utf8"));
      expect(document.on.workflow_dispatch.inputs.repository.options).toEqual([
        "all",
        "moyarich/console",
      ]);
      expect(document.on.workflow_dispatch.inputs["dry-run"].default).toBe(
        true,
      );
      expect(syncYamlValues(options)).toBe(false);
      expect(() => syncYamlValues({ ...options, updates: [] })).toThrow(
        "At least one YAML update is required",
      );
      expect(() =>
        syncYamlValues({ ...options, file: "../../outside.yml" }),
      ).toThrow("Invalid YAML file path");
    } finally {
      process.chdir(old);
      rmSync(root, { recursive: true, force: true });
    }
  });
});
