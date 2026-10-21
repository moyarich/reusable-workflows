/** Public CLI module exports and feature entry point. @module */
export {
  parseWorkspaceToolsSource,
  resolveBinDir,
  validateBinDir,
} from "./setup-workspace-tools/setup-workspace-tools";
export { validateReleaseMarker } from "./release-draft-sync/identity";
export {
  validate as validateBrowserManifest,
  safeDir as safeBrowserDirectory,
} from "./browser-extension-publish/manifest";
export type { Store } from "./browser-extension-publish/manifest";
