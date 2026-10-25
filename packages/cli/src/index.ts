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
export {
  copyFiles,
  validateOptions as validateCopyFilesOptions,
} from "./copy-files-to-another-repository/index";
export type { CopyOptions } from "./copy-files-to-another-repository/index";
export { syncYamlValues } from "./workflow-choices/sync";
export type { YamlUpdate, YamlUpdateOptions } from "./workflow-choices/sync";
