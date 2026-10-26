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
  it("rejects cycles without mutating inputs", () => {
    const input = [pkg("a", ["b"]), pkg("b", ["a"])];
    expect(() => batchesFor(input as never)).toThrow(/cycle/);
    expect(input[0].dependencies[0].name).toBe("b");
  });
});
