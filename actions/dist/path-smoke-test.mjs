import { appendFileSync } from "node:fs";

if (!process.env.GITHUB_OUTPUT) {
  throw new Error("GITHUB_OUTPUT is required");
}
appendFileSync(process.env.GITHUB_OUTPUT, "shared-dist-supported=true\n");
console.log("Successfully ran shared JavaScript action distribution");
