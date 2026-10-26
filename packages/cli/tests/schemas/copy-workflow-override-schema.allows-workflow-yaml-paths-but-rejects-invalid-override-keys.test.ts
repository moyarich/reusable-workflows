import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import "yaml";
describe("copier workflow overrides schema", () => {
  it("allows workflow YAML paths but rejects invalid override keys", () => {
    const schemaPath = fileURLToPath(
      new URL("../../src/schemas/copy-config.schema.json", import.meta.url),
    );
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    const pattern = new RegExp(
      schema.$defs.destination.properties.overrides.propertyNames.pattern,
    );
    expect(
      pattern.test(".github/workflows/sync-release-package-choices.yml"),
    ).toBe(true);
    expect(pattern.test(".github/workflows/ci_actionlint.yaml")).toBe(true);
    expect(pattern.test("other/workflows/ci.yml")).toBe(false);
    expect(pattern.test(".github/workflows/nested/ci.yml")).toBe(false);
    expect(pattern.test(".github/workflows/ci.txt")).toBe(false);
  });
});
