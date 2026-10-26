import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runtimeAssets } from "../../../plugins/runtime-assets";
let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "runtime-assets-test-"));
  writeFileSync(join(root, "entry.ts"), 'console.log("ready");\n');
  writeFileSync(join(root, "schema.json"), '{"type":"object"}\n');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
describe("runtime assets Vite plugin", () => {
  it("rejects asset paths outside the output directory", () => {
    expect(() =>
      runtimeAssets({
        source: join(root, "schema.json"),
        destination: "../../../config.json",
      }),
    ).toThrow("Unsafe runtime asset path");
  });
});
