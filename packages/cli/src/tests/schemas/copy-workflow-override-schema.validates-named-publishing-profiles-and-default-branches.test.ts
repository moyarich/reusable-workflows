import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

describe("copier workflow overrides schema", () => {
  it("validates named publishing profiles and default branches", () => {
    const root = fileURLToPath(
      new URL("../../../../../.github/copy-files-config.yml", import.meta.url),
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
});
