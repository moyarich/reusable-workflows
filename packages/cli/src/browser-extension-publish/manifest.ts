import { readFileSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import process from "node:process";
/** Public store API. */
export type Store = "chrome" | "firefox" | "all";
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
  if (
    ![2, 3].includes(manifest.manifest_version) ||
    typeof manifest.name !== "string" ||
    !manifest.name.trim() ||
    !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(manifest.version)
  )
    throw new Error(
      "Invalid browser extension manifest version, name, or version",
    );
  const gecko =
    manifest.browser_specific_settings?.gecko?.id ??
    manifest.applications?.gecko?.id;
  if (registry !== "chrome" && !gecko)
    throw new Error("Firefox requires browser_specific_settings.gecko.id");
  if (firefoxId && gecko !== firefoxId)
    throw new Error("Firefox ID does not match manifest");
  return {
    dir,
    version: manifest.version as string,
    name: manifest.name as string,
  };
}
