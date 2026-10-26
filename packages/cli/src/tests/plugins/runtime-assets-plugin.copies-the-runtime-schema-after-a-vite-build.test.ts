import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "vite";
import { runtimeAssets } from "../../../plugins/runtime-assets";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "runtime-assets-test-"));
  writeFileSync(join(root, "entry.ts"), 'console.log("ready");\n');
  writeFileSync(join(root, "schema.json"), '{"type":"object"}\n');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("runtime assets Vite plugin", () => {
  it("copies the runtime schema after a Vite build", async () => {
    await build({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [
        runtimeAssets({
          source: join(root, "schema.json"),
          destination: "schemas/config.json",
        }),
      ],
      build: {
        ssr: true,
        outDir: "dist",
        rollupOptions: { input: join(root, "entry.ts") },
      },
    });
    expect(readFileSync(join(root, "dist/schemas/config.json"), "utf8")).toBe(
      '{"type":"object"}\n',
    );
  });
});
