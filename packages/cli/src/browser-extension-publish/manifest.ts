import { readFileSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import process from "node:process";
/** Public store API. */
import { validateManifest } from "./manifest-rules.ts";
import type { Store } from "./manifest-rules.ts";
export type { Store } from "./manifest-rules.ts";
/** Public safe dir API. */
export function safeDir(value: string) {
  const root = process.cwd();
  const absolute = resolve(root, value);
  const rel = relative(root, absolute);
  if (
    rel === ".." ||
    rel.startsWith("../") ||
    rel.startsWith("..\\") ||
    rel.startsWith("/")
  )
    throw new Error("Directory must be inside the workspace");
  return absolute;
}
/** Public validate API. */
export function validate(directory: string, registry: Store, firefoxId = "") {
  const dir = safeDir(directory);
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  return { dir, ...validateManifest(manifest, registry, firefoxId) };
}
