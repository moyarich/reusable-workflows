import { describe, expect, it } from "vitest";
import { resolveWorkspaceManifests } from "../../resolve-workspaces/resolve-manifests.ts";

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
});
