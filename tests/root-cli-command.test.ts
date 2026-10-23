import { describe, expect, it } from "vitest";
import { createRootCliCommand } from "../packages/cli/src/root-cli-command.ts";

describe("root Commander CLI factory", () => {
  it("creates independent instances without parsing argv", () => {
    const first = createRootCliCommand();
    const second = createRootCliCommand();
    expect(first).not.toBe(second);
    expect(first.commands.map((command) => command.name())).toEqual(["workspace-source", "release-validate", "browser"]);
    expect(second.commands).toHaveLength(3);
  });
});
