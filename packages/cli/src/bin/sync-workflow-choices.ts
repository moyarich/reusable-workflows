import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { syncWorkflowChoice } from "../workflow-choices/sync.ts";

const args = process.argv.slice(2);
const value = (name: string): string => {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error("Missing " + name);
  return args[index + 1];
};
const config = parse(readFileSync(value("--config"), "utf8"));
const repositories = config?.repositories;
if (!Array.isArray(repositories) || !repositories.length)
  throw new Error("No configured destination repositories");
const names = repositories.map((entry: { name?: unknown }) => entry?.name);
if (
  names.some(
    (name: unknown) =>
      typeof name !== "string" || !/^[\\w.-]+\/[\\w.-]+$/.test(name as string),
  )
)
  throw new Error("Invalid destination repository");
const updated = syncWorkflowChoice({
  workflowFile: value("--workflow"),
  input: value("--input"),
  options: ["all", ...(names as string[])],
  defaultValue: "all",
  check: args.includes("--check"),
});
console.log(
  updated
    ? "Updated workflow dispatch choices"
    : "Workflow dispatch choices already current",
);
