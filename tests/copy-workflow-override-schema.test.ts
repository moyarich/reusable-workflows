import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

describe("copier workflow overrides schema", () => {
  it("validates publishing assignments expanded from YAML aliases", () => {
    const root = fileURLToPath(
      new URL("../.github/copy-files-config.yml", import.meta.url),
    );
    const schemaPath = fileURLToPath(
      new URL(
        "../packages/cli/src/copy-files-to-another-repository/config.schema.json",
        import.meta.url,
      ),
    );
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    const config = YAML.parse(readFileSync(root, "utf8"), { merge: true });
    const repository = (name: string) =>
      config.repositories.find(
        (entry: { name: string }) => entry.name === "moyarich/" + name,
      );
    for (const name of [
      "colorshower",
      "vscode-act-runner-local",
      "JotebookSync",
      "element-inspector",
    ]) {
      const entry = repository(name);
      expect(entry).toBeDefined();
      expect(entry.include).toEqual(
        name === "element-inspector"
          ? ["publish-browser-extension.yml"]
          : ["JotebookSync"].includes(name)
            ? ["publish-browser-extension.yml"]
            : ["publish-vscode-vsx.yml"],
      );
      expect(entry["create-files"]).toContain(entry.include[0]);
      expect(schema.$defs.destination.properties.include.$ref).toBe(
        "#/$defs/patterns",
      );
    }
  });

  it("allows workflow YAML paths but rejects invalid override keys", () => {
    const schemaPath = fileURLToPath(
      new URL(
        "../packages/cli/src/copy-files-to-another-repository/config.schema.json",
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
