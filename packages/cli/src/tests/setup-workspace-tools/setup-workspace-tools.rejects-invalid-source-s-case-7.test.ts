import { describe, expect, test } from "vitest";
import { parseWorkspaceToolsSource } from "../../setup-workspace-tools/setup-workspace-tools";
describe("Workspace Tools source selection", () => {
  test("rejects invalid source %s (case 7)", () => {
    const source = "";
    expect(() => parseWorkspaceToolsSource(source)).toThrow();
  });
});
