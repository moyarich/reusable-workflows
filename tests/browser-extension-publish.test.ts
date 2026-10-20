import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validate } from "../src/actions/browser-extension-publish/manifest";

describe("browser extension manifest validation", () => {
  it("accepts Chrome and Firefox manifests, validating Gecko ID", () => {
    const directory = mkdtempSync(join(process.cwd(), ".browser-extension-test-"));
    try {
      mkdirSync(join(directory, "dist"));
      writeFileSync(join(directory, "dist", "manifest.json"), JSON.stringify({
        manifest_version: 3, name: "Example", version: "1.2.3",
        browser_specific_settings: { gecko: { id: "addon@example.org" } },
      }));
      const relative = join(directory, "dist").slice(process.cwd().length + 1);
      expect(validate(relative, "chrome").version).toBe("1.2.3");
      expect(validate(relative, "firefox", "addon@example.org").name).toBe("Example");
      expect(() => validate(relative, "firefox", "other@example.org")).toThrow(/Firefox ID/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it("rejects a path outside the workspace", () => {
    expect(() => validate("../outside", "chrome")).toThrow(/inside the workspace/);
  });
});
