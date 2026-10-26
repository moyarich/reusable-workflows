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
  it("rejects invalid workspace selections", () => {
    expect(() =>
      resolveWorkspaceManifests([workspace("core")], "missing", "caret"),
    ).toThrow(/Unknown workspace selector/);
  });
});
