import { describe, expect, it } from "vitest";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateWorkflows } from "../../src/copy-files-to-another-repository/generate";

describe("publisher copies without destination publisher dependency", () => {
  const run = (existingFiles?: string[]) => {
    const root = mkdtempSync(join(tmpdir(), "copier-publisher-bootstrap-"));
    const sourceRoot = join(root, "source");
    const output = join(root, "generated");
    mkdirSync(join(sourceRoot, ".github/workflows"), { recursive: true });
    const canonical =
      "name: Publish\njobs:\n  publish:\n    uses: moyarich/reusable-workflows/.github/workflows/reusable_npm-publish.yml@main\n";
    writeFileSync(join(sourceRoot, ".github/workflows/publish.yml"), canonical);
    const config = {
      source: { directory: ".github/workflows", allow: ["publish.yml"] },
      repositories: [{ name: "moyarich/console", include: ["publish.yml"] }],
    };
    try {
      const files = generateWorkflows({
        config,
        repository: "moyarich/console",
        sourceRoot,
        output,
        existingFiles,
      });
      return {
        files,
        copied: existsSync(join(output, ".github/workflows/publish.yml"))
          ? readFileSync(join(output, ".github/workflows/publish.yml"), "utf8")
          : undefined,
      };
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };

  it("bootstraps a destination with no workflows", () => {
    expect(run([])).toEqual({
      files: [".github/workflows/publish.yml"],
      copied: expect.stringContaining("reusable_npm-publish.yml"),
    });
  });

  it("bootstraps when other workflows exist but publish.yml does not", () => {
    expect(run(["ci.yml"]).files).toEqual([".github/workflows/publish.yml"]);
  });

  it("copies when destination already has publish.yml", () => {
    expect(run(["publish.yml"]).files).toEqual([
      ".github/workflows/publish.yml",
    ]);
  });

  it("copies when destination inventory is not supplied", () => {
    expect(run().files).toEqual([".github/workflows/publish.yml"]);
  });

  it("does not require inspection of the existing publisher", () => {
    expect(run(["publish.yml", "release.yml"]).copied).toContain(
      "reusable_npm-publish.yml",
    );
  });
});
