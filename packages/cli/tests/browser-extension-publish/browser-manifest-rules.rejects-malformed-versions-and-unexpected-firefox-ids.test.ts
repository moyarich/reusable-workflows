import { describe, expect, it } from "vitest";
import { validateManifest } from "../../src/browser-extension-publish/manifest-rules.ts";

const manifest = {
  manifest_version: 3,
  name: "Example Add-on",
  version: "1.2.3",
  browser_specific_settings: { gecko: { id: "example@example.org" } },
};

describe("pure browser extension manifest validation", () => {
  it("rejects malformed versions and unexpected Firefox IDs", () => {
    expect(() =>
      validateManifest({ ...manifest, version: {} }, "chrome"),
    ).toThrow(/Invalid browser extension/);
    expect(() =>
      validateManifest(manifest, "firefox", "other@example.org"),
    ).toThrow(/Firefox ID/);
    expect(() =>
      validateManifest(
        { ...manifest, browser_specific_settings: undefined },
        "firefox",
      ),
    ).toThrow(/Firefox requires/);
  });
});
