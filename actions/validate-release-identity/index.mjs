import process from "node:process";
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { validateReleaseMarker } from "../release-draft-sync/identity.ts";
const input = name => process.env["INPUT_" + name.toUpperCase().replaceAll("-", "_")] || "";
try {
  const tag = input("release-tag");
  if (!tag) throw new Error("release-tag is required");
  const raw = execFileSync("gh", ["api", "--paginate", "--slurp", "repos/" + process.env.GITHUB_REPOSITORY + "/releases?per_page=100"], { encoding: "utf8" });
  const release = JSON.parse(raw).flat().find(item => item.tag_name === tag);
  if (!release) {
    if (input("required") === "true") throw new Error("No GitHub Release for tag: " + tag);
    console.log("No release exists for tag " + tag + "; skipping marker validation.");
  } else {
    const marker = validateReleaseMarker(release.body || "", {
      tag,
      package: input("package-name"),
      version: input("version"),
      target: input("target")
    });
    console.log("Release " + tag + " metadata format: " + marker.format);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "format=" + marker.format + "\n");
  }
} catch (error) {
  console.error("::error::" + error.message);
  process.exitCode = 1;
}
