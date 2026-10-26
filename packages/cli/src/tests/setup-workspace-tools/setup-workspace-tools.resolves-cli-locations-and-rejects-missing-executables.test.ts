import { describe, expect, test } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveBinDir,
  validateBinDir,
} from "../../setup-workspace-tools/setup-workspace-tools";
describe("Workspace Tools source selection", () => {
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
});
