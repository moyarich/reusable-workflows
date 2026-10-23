/** Public CLI module exports and feature entry point. @module */
export {
  parseWorkspaceToolsSource,
  resolveBinDir,
  validateBinDir,
} from "./setup-workspace-tools/setup-workspace-tools.js";
export { validateReleaseMarker } from "./release-draft-sync/identity.js";
export {
  validate as validateBrowserManifest,
  safeDir as safeBrowserDirectory,
} from "./browser-extension-publish/manifest.js";
export type { Store } from "./browser-extension-publish/manifest.js";
