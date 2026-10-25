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
import { syncWorkflowChoice } from "../packages/cli/src/workflow-choices/sync";

describe("workflow choice synchronization", () => {
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
        workflowFile: file,
        input: "repository",
        options: ["all", "moyarich/console"],
        defaultValue: "all",
      };
      expect(() => syncWorkflowChoice({ ...options, check: true })).toThrow(
        "out of sync",
      );
      expect(syncWorkflowChoice(options)).toBe(true);
      const document = parse(readFileSync(file, "utf8"));
      expect(document.on.workflow_dispatch.inputs.repository.options).toEqual([
        "all",
        "moyarich/console",
      ]);
      expect(document.on.workflow_dispatch.inputs["dry-run"].default).toBe(
        true,
      );
      expect(syncWorkflowChoice(options)).toBe(false);
      expect(() =>
        syncWorkflowChoice({ ...options, options: ["all", "all"] }),
      ).toThrow("Invalid");
      expect(() =>
        syncWorkflowChoice({ ...options, workflowFile: "../outside.yml" }),
      ).toThrow("inside");
    } finally {
      process.chdir(old);
      rmSync(root, { recursive: true, force: true });
    }
  });
});
