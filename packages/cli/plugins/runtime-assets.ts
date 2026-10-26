import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import type { Plugin } from "vite";

/** Copy runtime data after builds, including package-bin's nested Vite builds. */
export function runtimeAssets(options: {
  source: string;
  destination: string;
  outputDirectory?: string;
}): Plugin {
  if (
    !options.destination ||
    isAbsolute(options.destination) ||
    options.destination.includes("\\") ||
    options.destination.split("/").includes("..")
  ) {
    throw new Error(`Unsafe runtime asset path: ${options.destination}`);
  }
  let outputDirectory: string;
  return {
    name: "runtime-assets",
    apply: "build",
    configResolved(config) {
      outputDirectory = resolve(
        config.root,
        options.outputDirectory ?? config.build.outDir,
      );
    },
    buildStart() {
      this.addWatchFile(options.source);
    },
    closeBundle() {
      const destination = resolve(outputDirectory, options.destination);
      mkdirSync(dirname(destination), { recursive: true });
      copyFileSync(options.source, destination);
    },
  };
}
