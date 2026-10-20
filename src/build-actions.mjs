import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { build } from "vite";

for (const directory of readdirSync("src/actions", { withFileTypes: true })) {
  if (!directory.isDirectory()) continue;
  const dir = join("src/actions", directory.name);
  if (
    !["index.ts", `${directory.name}-cli.ts`].some((filename) =>
      existsSync(join(dir, filename)),
    )
  ) {
    throw new Error(`Missing entry point for action: ${directory.name}`);
  }
  await build({ configFile: "vite.config.ts", mode: directory.name });
}
