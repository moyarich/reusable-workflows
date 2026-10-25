import { readFileSync, writeFileSync } from "node:fs";
import { parseDocument, isMap, isSeq, YAMLMap, YAMLSeq } from "yaml";

export interface WorkflowChoiceOptions {
  workflowFile: string;
  input: string;
  options: string[];
  defaultValue: string;
  check?: boolean;
}

/** Synchronize an existing workflow_dispatch choice input, preserving other YAML fields. */
export function syncWorkflowChoice(options: WorkflowChoiceOptions): boolean {
  const { workflowFile, input, defaultValue } = options;
  if (!/^\.github\/workflows\/[\w.-]+\.ya?ml$/.test(workflowFile)) {
    throw new Error("Workflow must be inside .github/workflows");
  }
  const unique = [...new Set(options.options)];
  if (!unique.length || unique.length !== options.options.length ||
      unique.some(value => !value || typeof value !== "string") ||
      !unique.includes(defaultValue) || unique.length > 100) {
    throw new Error("Invalid workflow choice options or default");
  }
  const original = readFileSync(workflowFile, "utf8");
  const document = parseDocument(original, { keepSourceTokens: true });
  if (document.errors.length) throw new Error(document.errors.join("; "));
  const inputs = document.getIn(["on", "workflow_dispatch", "inputs"], true);
  if (!isMap(inputs) || !isMap(inputs.get(input, true))) {
    throw new Error("Workflow dispatch input not found: " + input);
  }
  const choice = inputs.get(input, true) as YAMLMap;
  choice.set("type", "choice");
  choice.set("required", true);
  choice.set("default", defaultValue);
  const sequence = new YAMLSeq();
  sequence.items = unique.map(value => document.createNode(value));
  choice.set("options", sequence);
  const updated = String(document);
  if (updated === original) return false;
  if (options.check) throw new Error("Workflow choices are out of sync: " + workflowFile);
  writeFileSync(workflowFile, updated);
  return true;
}
