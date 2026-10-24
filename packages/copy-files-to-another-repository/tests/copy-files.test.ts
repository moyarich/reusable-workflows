import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateOptions } from "../src/index";

describe("copy repository options", () => {
  it("validates destination and source before a copy", () => {
    const source = mkdtempSync(join(tmpdir(), "copy-action-test-"));
    try {
      mkdirSync(join(source, "files"));
      const options = { sourceDirectory: source, repository: "moyarich/console", branch: "main", token: "test", dryRun: true, message: "sync" };
      expect(() => validateOptions(options)).not.toThrow();
      expect(() => validateOptions({ ...options, repository: "../bad" })).toThrow("Invalid repository");
      expect(() => validateOptions({ ...options, branch: "../main" })).toThrow("Invalid branch");
      expect(() => validateOptions({ ...options, token: "" })).toThrow("token");
    } finally { rmSync(source, { recursive: true, force: true }); }
  });
});
