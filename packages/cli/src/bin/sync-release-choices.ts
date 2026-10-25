import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename } from "node:path";
import { parseDocument, isMap } from "yaml";
import { syncYamlValues, type YamlUpdate } from "../workflow-choices/sync.ts";

const env = process.env;
const files = JSON.parse(env.WORKFLOW_FILES || "[]") as string[];
const targets = files.length ? files : [env.WORKFLOW_FILE ?? ".github/workflows/release.yml"];
const release = (JSON.parse(env.RELEASE_PACKAGES_JSON || "{}").included ?? []) as { directory: string }[];
const publish = (JSON.parse(env.PUBLISH_PACKAGES_JSON || "{}").included ?? []) as { directory: string }[];
const vscode = [".", ...["packages", "apps"].flatMap(root =>
  existsSync(root) ? readdirSync(root, {withFileTypes: true}).filter(d => d.isDirectory()).map(d => root + "/" + d.name) : []
)].filter(dir => {
  const manifest = dir + "/package.json";
  if (!existsSync(manifest)) return false;
  try {
    const data = JSON.parse(readFileSync(manifest, "utf8"));
    return Boolean(data.engines?.vscode || existsSync(dir + "/extension.manifest.json"));
  } catch { return false; }
}).sort();

for (const file of targets) {
  if (typeof file !== "string" || !file.startsWith(".github/workflows/") ||
      file.split("/").includes("..") || !/\.ya?ml$/.test(file))
    throw new Error("Invalid workflow file: " + file);
  if (!existsSync(file)) { console.log("Skipped missing " + file); continue; }
  const document = parseDocument(readFileSync(file, "utf8"));
  if (document.errors.length) throw new Error("Invalid YAML in " + file);
  const choice = document.getIn(["on", "workflow_dispatch", "inputs", "package"], true);
  if (!isMap(choice)) { console.log("Preserved selector: " + file); continue; }
  const kind = basename(file);
  const isVscode = kind === "publish-vscode-vsx.yml";
  const directories = isVscode ? vscode : [...new Set((kind === "publish.yml" ? publish : release).map(x => x.directory))].sort();
  if (!directories.length) { console.log("Preserved empty selection: " + file); continue; }
  const options = isVscode ? directories : ["all", ...directories];
  const description = isVscode ? "Select a VS Code extension workspace" : "Select a publishable workspace package";
  const base = ["on", "workflow_dispatch", "inputs", "package"];
  const updates: YamlUpdate[] = [
    {path: [...base, "description"], value: description},
    {path: [...base, "required"], value: true},
    {path: [...base, "type"], value: "choice"},
    {path: [...base, "default"], value: options[0]},
    {path: [...base, "options"], value: options},
  ];
  console.log(syncYamlValues({ file, updates }) ? "Updated " + file : "Already current: " + file);
}
