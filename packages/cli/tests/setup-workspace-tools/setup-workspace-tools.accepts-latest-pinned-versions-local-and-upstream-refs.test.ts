import { describe, expect, test } from "vitest";
import { parseWorkspaceToolsSource } from "../../src/setup-workspace-tools/setup-workspace-tools";
describe("Workspace Tools source selection", () => {
  test("accepts latest, pinned versions, local and upstream refs", () => {
    expect(parseWorkspaceToolsSource("registry:npm:latest")).toEqual({
      mode: "registry",
      value: "latest",
      source: "registry:npm:latest",
    });
    expect(parseWorkspaceToolsSource("registry:npm:0.2.2").value).toBe("0.2.2");
    expect(parseWorkspaceToolsSource("checkout:current").mode).toBe("current");
    expect(
      parseWorkspaceToolsSource("checkout:upstream;branch:main").value,
    ).toBe("refs/heads/main");
    expect(
      parseWorkspaceToolsSource("checkout:upstream;tag:v1.0.0").value,
    ).toBe("refs/tags/v1.0.0");
    expect(
      parseWorkspaceToolsSource("checkout:upstream;sha:" + "a".repeat(40))
        .value,
    ).toBe("a".repeat(40));
  });
});
