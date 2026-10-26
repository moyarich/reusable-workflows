import { describe, it, expect } from "vitest";
import { validate } from "../../src/browser-extension-publish/manifest";
describe("browser extension manifest validation", () => {
  it("rejects a path outside the workspace", () => {
    expect(() => validate("../../outside", "chrome")).toThrow(
      /inside the workspace/,
    );
  });
});
