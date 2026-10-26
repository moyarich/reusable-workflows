import { describe, expect, test } from "vitest";
import { parseWorkspaceToolsSource } from "../../setup-workspace-tools/setup-workspace-tools";
describe("Workspace Tools source selection", () => {
  test("rejects invalid source %s (case 4)", () => {
    const source = "checkout:upstream;branch:../bad";
    expect(() => parseWorkspaceToolsSource(source)).toThrow();
  });
});
