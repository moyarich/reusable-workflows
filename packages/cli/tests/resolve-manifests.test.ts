import { describe, expect, it } from "vitest";
import { resolveWorkspaceManifests } from "../src/resolve-workspaces/resolve-manifests.ts";

const workspace = (
  name: string,
  dependencies: Record<string, string> = {},
  isPrivate = false,
) => ({
  directory: "packages/" + name,
  absolute: "/repo/packages/" + name,
  pkg: { name, version: "1.2.3", dependencies, private: isPrivate },
});

describe("pure workspace manifest resolution", () => {
  it("rewrites only wildcard local dependencies without mutating inputs", () => {
    const all = [
      workspace("app", { core: "*", external: "^2.0.0" }),
      workspace("core"),
    ];
    const before = JSON.stringify(all);
    const resolved = resolveWorkspaceManifests(all, "app", "caret");
    expect(resolved.result).toHaveLength(2);
    expect(
      resolved.result.find((p) => p.name === "app")?.manifest.dependencies,
    ).toEqual({
      core: "^1.2.3",
      external: "^2.0.0",
    });
    expect(resolved.batches).toEqual([["core"], ["app"]]);
    expect(JSON.stringify(all)).toBe(before);
  });
  it("preserves explicit constraints", () => {
    const result = resolveWorkspaceManifests(
      [workspace("app", { core: "^0.9.0" }), workspace("core")],
      "all",
      "exact",
    );
    expect(
      result.result.find((p) => p.name === "app")?.manifest.dependencies?.core,
    ).toBe("^0.9.0");
  });
  it("rejects invalid workspace selections", () => {
    expect(() =>
      resolveWorkspaceManifests([workspace("core")], "missing", "caret"),
    ).toThrow(/Unknown workspace selector/);
  });
});
