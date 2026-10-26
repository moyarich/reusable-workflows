import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveWorkspaces } from "../../src/resolve-workspaces/index";
async function fixture() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "resolve-workspaces-"));
  const put = async (dir, data) => {
    await mkdir(path.join(cwd, dir), { recursive: true });
    await writeFile(
      path.join(cwd, dir, "package.json"),
      JSON.stringify(data, null, 2),
    );
  };
  await put(".", { name: "root", private: true, workspaces: ["packages/*"] });
  await put("packages/utils", { name: "@demo/utils", version: "2.0.0" });
  await put("packages/core", {
    name: "@demo/core",
    version: "1.0.0",
    dependencies: { "@demo/utils": "*" },
  });
  await put("packages/cli", {
    name: "@demo/cli",
    version: "1.0.0",
    dependencies: { "@demo/core": "*" },
  });
  return { cwd, put };
}
describe("resolve-workspaces", () => {
  it("rejects cycles instead of returning an unsafe publish order", async () => {
    const { cwd, put } = await fixture();
    try {
      await put("packages/utils", {
        name: "@demo/utils",
        version: "2.0.0",
        dependencies: { "@demo/cli": "*" },
      });
      await expect(resolveWorkspaces({ cwd, output: "" })).rejects.toThrow(
        /cycle/i,
      );
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
