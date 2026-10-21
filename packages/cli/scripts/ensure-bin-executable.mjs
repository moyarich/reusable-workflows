import { chmodSync, existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
);
for (const [name, file] of Object.entries(manifest.bin ?? {})) {
  const target = resolve(root, file);
  if (!target.startsWith(root + "/") || !existsSync(target)) {
    throw new Error(`Missing or unsafe CLI binary ${name}: ${file}`);
  }
  const content = readFileSync(target, "utf8");
  if (!content.startsWith("#!/usr/bin/env node")) {
    throw new Error(`CLI binary requires a Node.js shebang: ${name}`);
  }
  chmodSync(target, statSync(target).mode | 0o755);
}
