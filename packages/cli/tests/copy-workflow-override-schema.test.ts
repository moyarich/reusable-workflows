import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

describe("copier workflow overrides schema", () => {
  it("validates named publishing profiles and default branches", () => {
    const root = fileURLToPath(
      new URL("../../../.github/copy-files-config.yml", import.meta.url),
    );
    const config = YAML.parse(readFileSync(root, "utf8"));
    expect(config.defaults.branch).toBe("main");
    const expected = {
      colorshower: "vscode",
      "vscode-act-runner-local": "vscode",
      JotebookSync: "vscode",
      "element-inspector": "browser",
    };
    for (const [name, profile] of Object.entries(expected)) {
      const destination = config.repositories.find(
        (entry: { name: string }) => entry.name === "moyarich/" + name,
      );
      expect(destination.profiles).toEqual([profile]);
      const files = config.profiles[profile].include;
      expect(files).toHaveLength(1);
    }
  });

  it("allows workflow YAML paths but rejects invalid override keys", () => {
    const schemaPath = fileURLToPath(
      new URL(
        "../src/copy-files-to-another-repository/config.schema.json",
        import.meta.url,
      ),
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
