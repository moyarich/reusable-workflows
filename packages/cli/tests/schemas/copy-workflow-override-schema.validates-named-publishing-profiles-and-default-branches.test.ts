import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

describe("upstream copier compatibility shell", () => {
  it("delegates destination inventory to callers without retaining destinations", () => {
    const root = fileURLToPath(
      new URL("../../../../.github/copy-files-config.yml", import.meta.url),
    );
    const config = YAML.parse(readFileSync(root, "utf8"));
    expect(config.source.repository).toBe("moyarich/reusable-workflows-callers");
    expect(config.repositories).toEqual([]);
    expect(config.source.allow).toEqual([]);
  });
});
