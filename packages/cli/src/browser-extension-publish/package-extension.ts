/** ZIP packaging service for browser extension distribution. */
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { safeDir } from "./manifest.ts";

/** Package an extension directory and verify its ZIP archive. */
export function packageExtension(
  buildDirectory: string,
  destination = "extension.zip",
): string {
  const directory = safeDir(buildDirectory);
  readFileSync(join(directory, "manifest.json"));
  const output = resolve(process.cwd(), destination);
  if (existsSync(output)) throw new Error("Output already exists: " + output);
  mkdirSync(dirname(output), { recursive: true });
  execFileSync("zip", ["-q", "-r", output, "."], { cwd: directory });
  execFileSync("unzip", ["-t", output], { stdio: "ignore" });
  return output;
}
