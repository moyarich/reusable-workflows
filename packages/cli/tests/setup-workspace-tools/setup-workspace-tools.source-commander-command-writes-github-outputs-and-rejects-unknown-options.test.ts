import { describe, expect, test } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSetupWorkspaceToolsCommand } from "../../src/setup-workspace-tools/setup-workspace-tools-cli";
describe("Workspace Tools source selection", () => {
  test("source Commander command writes GitHub outputs and rejects unknown options", async () => {
    const root = mkdtempSync(join(tmpdir(), "workspace-tools-setup-cli-"));
    try {
      const output = join(root, "outputs");
      await createSetupWorkspaceToolsCommand().parseAsync(
        [
          "--workspace-tools-source",
          "registry:npm:latest",
          "--github-output",
          output,
        ],
        { from: "user" },
      );
      expect(readFileSync(output, "utf8")).toContain(
        "mode=registry\nvalue=latest",
      );
      const invalid = createSetupWorkspaceToolsCommand().exitOverride();
      await expect(
        invalid.parseAsync(
          ["--workspace-tools-source", "registry:npm:latest", "--invalid"],
          { from: "user" },
        ),
      ).rejects.toMatchObject({
        code: "commander.unknownOption",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
