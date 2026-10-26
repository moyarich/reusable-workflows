import { describe, expect, test } from "vitest";
import { parseWorkspaceToolsSource } from "../../src/setup-workspace-tools/setup-workspace-tools";
describe("Workspace Tools source selection", () => {
  test("rejects invalid source %s (case 2)", () => {
    const source = "registry:npm:^1.0.0";
    expect(() => parseWorkspaceToolsSource(source)).toThrow();
  });
});
