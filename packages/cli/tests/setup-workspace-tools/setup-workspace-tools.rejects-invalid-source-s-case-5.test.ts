import { describe, expect, test } from "vitest";
import { parseWorkspaceToolsSource } from "../../src/setup-workspace-tools/setup-workspace-tools";
describe("Workspace Tools source selection", () => {
  test("rejects invalid source %s (case 5)", () => {
    const source = "checkout:upstream;sha:abc";
    expect(() => parseWorkspaceToolsSource(source)).toThrow();
  });
});
