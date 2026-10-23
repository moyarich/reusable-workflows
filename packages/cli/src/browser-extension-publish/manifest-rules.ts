/** Pure validation for extension manifest content. */
export type Store = "chrome" | "firefox" | "all";
export type ExtensionManifest = {
  manifest_version?: unknown;
  name?: unknown;
  version?: unknown;
  browser_specific_settings?: { gecko?: { id?: string } };
  applications?: { gecko?: { id?: string } };
};
/** Verify extension metadata without accessing the filesystem. */
export function validateManifest(
  manifest: ExtensionManifest,
  registry: Store,
  firefoxId = "",
) {
  if (
    typeof manifest.manifest_version !== "number" ||
    ![2, 3].includes(manifest.manifest_version) ||
    typeof manifest.name !== "string" ||
    !manifest.name.trim() ||
    typeof manifest.version !== "string" ||
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
  return { version: manifest.version as string, name: manifest.name as string };
}
