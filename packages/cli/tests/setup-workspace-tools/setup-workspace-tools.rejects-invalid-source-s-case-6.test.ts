import { describe, expect, test } from "vitest";
import { parseWorkspaceToolsSource } from "../../src/setup-workspace-tools/setup-workspace-tools";
describe("Workspace Tools source selection", () => {
  test("rejects invalid source %s (case 6)", () => {
    const source = "checkout:else";
    expect(() => parseWorkspaceToolsSource(source)).toThrow();
  });
});
