import { describe, expect, it } from "vitest";
import {
  globRegex,
  batchesFor,
} from "../packages/cli/src/resolve-workspaces/workspace-rules.ts";

describe("pure workspace matching", () => {
  it("matches workspace glob patterns", () => {
    expect(globRegex("packages/*").test("packages/cli")).toBe(true);
    expect(globRegex("packages/*").test("packages/cli/internal")).toBe(false);
    expect(globRegex("apps/**").test("apps/demo/nested")).toBe(true);
  });
});

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
  it("rejects cycles without mutating inputs", () => {
    const input = [pkg("a", ["b"]), pkg("b", ["a"])];
    expect(() => batchesFor(input as never)).toThrow(/cycle/);
    expect(input[0].dependencies[0].name).toBe("b");
  });
});
