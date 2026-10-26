import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { copyWorkflow } from "../src/copy/copy-workflows.js";

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
      repositories: [{ name: "example/one" }, { name: "example/two" }],
    }),
  );
  options = {
    config: join(root, "config.yml"),
    schema: fileURLToPath(
      new URL(
        "../src/copy-files-to-another-repository/config.schema.json",
        import.meta.url,
      ),
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
  it.each(["", "all"])(
    "plans every allowlisted destination for selection %j",
    (repository) => {
      copyWorkflow({ ...options, repository, plan: true });
      expect(matrix().include).toEqual([
        { name: "example/one", branch: "main" },
        { name: "example/two", branch: "main" },
      ]);
    },
  );
  it("plans only the selected allowlisted destination", () => {
    copyWorkflow({ ...options, repository: "example/one", plan: true });
    expect(matrix().include).toEqual([{ name: "example/one", branch: "main" }]);
  });
  it("continues rejecting unknown repositories", () => {
    expect(() =>
      copyWorkflow({ ...options, repository: "example/missing", plan: true }),
    ).toThrow("not in the allowlist");
  });
  it("generates all selected workflows when the workflow input is all", () => {
    copyWorkflow({ ...options, repository: "example/one", workflow: "all" });
    expect(existsSync(join(root, "output/.github/workflows/ci_cli.yml"))).toBe(
      true,
    );
    expect(existsSync(join(root, "output/.github/workflows/ci_lint.yml"))).toBe(
      true,
    );
  });
  it("keeps explicit workflow selection", () => {
    copyWorkflow({
      ...options,
      repository: "example/one",
      workflow: "ci_cli.yml",
    });
    expect(existsSync(join(root, "output/.github/workflows/ci_cli.yml"))).toBe(
      true,
    );
    expect(existsSync(join(root, "output/.github/workflows/ci_lint.yml"))).toBe(
      false,
    );
  });
  it("requires a concrete repository when generating files", () => {
    expect(() => copyWorkflow({ ...options, repository: "all" })).toThrow(
      "--repository and --output are required",
    );
  });
});
