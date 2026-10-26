import { describe, expect, it } from "vitest";
import { globRegex } from "../../src/resolve-workspaces/workspace-rules.ts";
describe("pure workspace matching", () => {
  it("matches workspace glob patterns", () => {
    expect(globRegex("packages/*").test("packages/cli")).toBe(true);
    expect(globRegex("packages/*").test("packages/cli/internal")).toBe(false);
    expect(globRegex("apps/**").test("apps/demo/nested")).toBe(true);
  });
});
