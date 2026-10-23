/** Firefox Add-ons signing and submission service, independent of Commander. */
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { validate, safeDir } from "./manifest.js";

/** Validate an extension and submit it to Firefox Add-ons for signing. */
export function firefoxPublish(
  buildDirectory: string,
  outputDirectory = "firefox-signed",
): void {
  const key = process.env.FIREFOX_API_KEY;
  const secret = process.env.FIREFOX_API_SECRET;
  if (!key || !secret) throw new Error("Firefox API credentials required");
  validate(buildDirectory, "firefox");
  const output = safeDir(outputDirectory);
  mkdirSync(output, { recursive: true });
  execFileSync(
    "npm",
    [
      "exec",
      "--yes",
      "--package=web-ext",
      "--",
      "web-ext",
      "sign",
      "--source-dir",
      safeDir(buildDirectory),
      "--artifacts-dir",
      output,
      "--channel",
      "listed",
      "--api-key",
      key,
      "--api-secret",
      secret,
    ],
    { stdio: "inherit" },
  );
}
