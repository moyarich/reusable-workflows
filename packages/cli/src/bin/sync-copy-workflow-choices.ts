import { readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";
import { syncYamlValues } from "../workflow-choices/sync";

const args = process.argv.slice(2);
function option(key: string): string {
  const i = args.indexOf(key);
  if (i < 0 || !args[i + 1]) throw new Error("Missing " + key);
  return args[i + 1];
}
const source = parse(readFileSync(option("--config"), "utf8"))?.source;
if (!source || source.directory !== ".github/workflows")
  throw new Error("Expected source.directory .github/workflows");
const patterns = (kind: "include" | "exclude"): string[] => {
  const list = source[kind] ?? [];
  if (
    !Array.isArray(list) ||
    list.some((s) => typeof s !== "string" || !/^[A-Za-z0-9_.*-]+$/.test(s))
  )
    throw new Error("Invalid source." + kind);
  return list;
};
const include = patterns("include"),
  exclude = patterns("exclude");
if (!include.length) throw new Error("Missing source.include");
const matches = (name: string, globs: string[]) =>
  globs.some((pattern) => {
    const regex =
      "^" +
      pattern
        .split("*")
        .map((part) => part.replaceAll(".", "\\."))
        .join(".*") +
      "$";
    return new RegExp(regex).test(name);
  });
const files = readdirSync(option("--source-directory"), { withFileTypes: true })
  .filter((item) => item.isFile() && item.name.endsWith(".yml"))
  .map((item) => item.name)
  .filter((name) => matches(name, include) && !matches(name, exclude))
  .sort();
if (!files.length)
  throw new Error("No canonical workflows match configured patterns");
const options = ["all", ...files];
if (options.length > 100)
  throw new Error("GitHub workflow_dispatch supports at most 100 options");
const file = option("--workflow");
const changed = syncYamlValues({
  file,
  check: args.includes("--check"),
  updates: [
    {
      path: ["on", "workflow_dispatch", "inputs", "workflow", "options"],
      value: options,
    },
  ],
});
console.log(
  changed ? "Updated workflow choices" : "Workflow choices already current",
);
