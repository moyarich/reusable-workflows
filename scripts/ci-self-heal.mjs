import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const log = readFileSync(process.argv[2], "utf8");
const file = ".github/workflows/ci.yml";
const marker = "Cannot find module '@vitest/browser-playwright'";
const old = "const require = createRequire(import.meta.url);";
const repaired = 'const require = createRequire(join(process.cwd(), "apps/playground/package.json"));';

if (log.includes(marker) && existsSync(file)) {
  const source = readFileSync(file, "utf8");
  if (source.includes(old) && source.includes('require.resolve("@vitest/browser-playwright")')) {
    writeFileSync(file, source.replace(old, repaired));
    console.log("Repaired playground-scoped Playwright provider lookup");
    process.exit(0);
  }
}
if (/npm audit|vulnerabilities|security vulnerabilities/i.test(log)) {
  const audit = spawnSync("npm", ["audit", "fix"], { stdio: "inherit" });
  if (audit.status !== 0) {
    console.error("npm audit fix did not complete cleanly; recovery is not safe");
    process.exit(1);
  }
  console.log("Applied npm audit fix within declared semver ranges");
  process.exit(0);
}
console.log("Unrecognized CI failure; leaving repository unchanged");
