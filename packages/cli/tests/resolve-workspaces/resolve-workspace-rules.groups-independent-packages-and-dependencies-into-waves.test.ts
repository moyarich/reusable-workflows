import { describe, expect, it } from "vitest";
import { batchesFor } from "../../src/resolve-workspaces/workspace-rules.ts";

describe("pure publish ordering", () => {
  const pkg = (name: string, dependencies: string[] = []) => ({
    name,
    dependencies: dependencies.map((dep) => ({
      name: dep,
      publishDependency: true,
    })),
  });
  it("groups independent packages and dependencies into waves", () => {
    const input = [pkg("app", ["core"]), pkg("core"), pkg("docs")];
    expect(batchesFor(input as never)).toEqual([["core", "docs"], ["app"]]);
    expect(input[0].dependencies).toHaveLength(1);
  });
});
