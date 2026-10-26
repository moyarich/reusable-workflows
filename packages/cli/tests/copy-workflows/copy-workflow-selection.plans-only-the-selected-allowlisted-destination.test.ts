import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { copyWorkflow } from "../../src/copy-workflows/copy-workflows.js";
let root: string;
let options: Parameters<typeof copyWorkflow>[0];
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "copy-selection-"));
  mkdirSync(join(root, ".github/workflows"), { recursive: true });
  for (const file of ["ci_cli.yml", "ci_lint.yml"])
    writeFileSync(
      join(root, ".github/workflows", file),
      "name: CI\non: push\njobs: {}\n",
    );
  writeFileSync(
    join(root, "config.yml"),
    JSON.stringify({
      source: {
        repository: "example/source",
        directory: ".github/workflows",
        allow: ["*.yml"],
      },
      defaults: { branch: "main", include: ["*.yml"] },
      repositories: [{ name: "example/one", profiles: ["npm"] }, { name: "example/two" }],
    }),
  );
  options = {
    config: join(root, "config.yml"),
    schema: fileURLToPath(
      new URL("../../src/schemas/copy-config.schema.json", import.meta.url),
    ),
    sourceRoot: root,
    workflow: "",
    output: join(root, "output"),
  };
  vi.stubEnv("GITHUB_OUTPUT", join(root, "job-output"));
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});
function matrix() {
  const line = readFileSync(join(root, "job-output"), "utf8")
    .split("\n")
    .find((line) => line.startsWith("matrix="))!;
  return JSON.parse(line.slice("matrix=".length));
}
describe("copy workflow selection", () => {
  it("plans only the selected allowlisted destination", () => {
    copyWorkflow({ ...options, repository: "example/one", plan: true });
    expect(matrix().include).toEqual([{ name: "example/one", branch: "main", profiles: ["npm"] }]);
  });
});
