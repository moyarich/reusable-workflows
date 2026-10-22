import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveWorkspaces } from "../packages/cli/src/resolve-workspaces/index";

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
  it("resolves wildcard ranges, orders dependencies and leaves source unchanged by default", async () => {
    const { cwd } = await fixture();
    try {
      const result = await resolveWorkspaces({ cwd, output: "report.json" });
      expect(result.publish.order).toEqual([
        "@demo/utils",
        "@demo/core",
        "@demo/cli",
      ]);
      expect(result.summary.dependenciesResolved).toBe(2);
      expect(
        result.packages.find((p) => p.name === "@demo/core").changes[0].to,
      ).toBe("^2.0.0");
      const actual = JSON.parse(
        await readFile(path.join(cwd, "packages/core/package.json"), "utf8"),
      );
      expect(actual.dependencies["@demo/utils"]).toBe("*");
      const saved = JSON.parse(
        await readFile(path.join(cwd, "report.json"), "utf8"),
      );
      expect(saved.publish.order).toEqual(result.publish.order);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("selects a package and includes transitive publication prerequisites", async () => {
    const { cwd } = await fixture();
    try {
      const result = await resolveWorkspaces({
        cwd,
        packageSelector: "packages/cli",
        range: "exact",
        output: "",
      });
      expect(result.publish.order).toEqual([
        "@demo/utils",
        "@demo/core",
        "@demo/cli",
      ]);
      expect(
        result.packages.find((p) => p.name === "@demo/cli").changes[0].to,
      ).toBe("1.0.0");
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

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
