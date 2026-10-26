import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runSelection } from "../../src/check-dist/select.js";
const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function fixture(config?: string) {
  const directory = mkdtempSync(join(tmpdir(), "check-dist-validation-"));
  directories.push(directory);
  const configPath = join(directory, "config.yml");
  if (config !== undefined) writeFileSync(configPath, config);
  return {
    DISCOVERED: JSON.stringify({
      included: [{ name: "example", directory: "packages/example" }],
    }),
    CONFIG_FILE: configPath,
    PACKAGES: "all",
    GITHUB_OUTPUT: join(directory, "output"),
  };
}
describe("check-dist configuration validation", () => {
  it("allows an absent optional configuration file", () => {
    const env = fixture();
    runSelection(env);
    expect(readFileSync(env.GITHUB_OUTPUT, "utf8")).toContain(
      "has-packages=true",
    );
  });
});
