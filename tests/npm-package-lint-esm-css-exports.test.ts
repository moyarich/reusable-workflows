import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

/** Exercise the same inline validator invoked by the reusable workflow. */
const workflow = readFileSync(
  new URL("../.github/workflows/reusable_ci_npm-package-lint.yml", import.meta.url),
  "utf8",
);
const embeddedScript = workflow.match(
  /if node --input-type=module - "\$location\/package\.json" "\$diagnostics" <<'NODE'\n([\s\S]*?)\n {10}NODE/,
);
if (!embeddedScript) {
  throw new Error("Reusable npm package lint workflow validator not found.");
}
const validator = embeddedScript[1]
  .split("\n")
  .map((line) => line.replace(/^ {10}/, ""))
  .join("\n");

interface Problem {
  entrypoint: string;
  resolutionKind: string;
}

function validate(
  exports: Record<string, unknown>,
  problems: Record<string, Problem[]>,
) {
  const directory = mkdtempSync(join(tmpdir(), "npm-package-esm-"));
  try {
    const manifestPath = join(directory, "package.json");
    const diagnosticsPath = join(directory, "diagnostics.json");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        type: "module",
        engines: { node: ">=24.11.0" },
        exports,
      }),
    );
    writeFileSync(diagnosticsPath, JSON.stringify({ problems }));
    return spawnSync(
      process.execPath,
      ["--input-type=module", "-", manifestPath, diagnosticsPath],
      { input: validator, encoding: "utf8" },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const esmExports = {
  "./vite": {
    types: "./dist/vite.d.ts",
    import: "./dist/vite.js",
    default: "./dist/vite.js",
  },
  "./virtual": { types: "./dist/virtual.d.ts" },
  "./styles.css": "./dist/styles.css",
};

test("ESM-only packages with CSS and type-only exports ignore unsupported CommonJS checks", () => {
  const result = validate(esmExports, {
    CJSResolvesToESM: [
      { entrypoint: "./vite", resolutionKind: "node16-cjs" },
      { entrypoint: "./virtual", resolutionKind: "node16-cjs" },
    ],
    NoResolution: [
      { entrypoint: "./vite", resolutionKind: "node10" },
    ],
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("All declared ESM and bundler resolutions passed.");
});

test("ESM and bundler resolution errors still fail with a CSS export", () => {
  const result = validate(esmExports, {
    NoResolution: [
      { entrypoint: "./vite", resolutionKind: "node16-esm" },
      { entrypoint: "./vite", resolutionKind: "bundler" },
    ],
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("node16-esm");
  expect(result.stderr).toContain("bundler");
});

test("a declared CommonJS entry is not exempted from CommonJS validation", () => {
  const result = validate(
    {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
        require: "./dist/index.cjs",
      },
      "./styles.css": "./dist/styles.css",
    },
    {
      CJSResolvesToESM: [
        { entrypoint: ".", resolutionKind: "node16-cjs" },
      ],
    },
  );
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("CJSResolvesToESM");
});

test("a string JavaScript export is not misclassified as a stylesheet", () => {
  const result = validate(
    {
      "./entry.js": "./dist/entry.js",
      "./styles.css": "./dist/styles.css",
    },
    {
      CJSResolvesToESM: [
        { entrypoint: "./entry.js", resolutionKind: "node16-cjs" },
      ],
    },
  );
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("CJSResolvesToESM");
});
