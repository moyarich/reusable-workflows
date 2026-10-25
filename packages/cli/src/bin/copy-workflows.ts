import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";
import { generateWorkflows } from "../copy-files-to-another-repository/generate.ts";

const argv = process.argv.slice(2);
function arg(name: string, fallback = ""): string {
  const index = argv.indexOf(name);
  return index < 0 ? fallback : (argv[index + 1] ?? fallback);
}
const configPath = arg("--config", ".github/copy-files-config.yml");
const schemaPath = arg(
  "--schema",
  "packages/cli/src/copy-files-to-another-repository/config.schema.json",
);
const parsedConfig: unknown = parse(readFileSync(configPath, "utf8"), { merge: true });
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
if (!validate(parsedConfig))
  throw Error(
    "Invalid copier configuration: " + ajv.errorsText(validate.errors),
  );
const config = parsedConfig as Record<string, unknown> & {
  source: { repository: string };
  defaults?: { branch?: string };
  repositories: Array<{ name: string; branch?: string }>;
};
const repositories = config.repositories as Array<{
  name: string;
  branch?: string;
}>;
for (const repository of config.repositories as Array<{
  name: string;
  profile?: string;
}>) {
  if (repository.profile !== undefined) {
    const profiles =
      (config as { profiles?: Record<string, unknown> }).profiles ?? {};
    if (!Object.hasOwn(profiles, repository.profile))
      throw Error("Unknown copier profile: " + repository.profile);
  }
}
const names = repositories.map((r) => r.name);
if (new Set(names).size !== names.length)
  throw Error("Duplicate copier destination");
const requested = arg("--repository");
if (requested && !names.includes(requested))
  throw Error("Requested repository is not in the allowlist");
if (argv.includes("--plan")) {
  const targets = repositories.filter(
    (r) => !requested || r.name === requested,
  );
  const matrix = {
    include: targets.map((r) => {
      const branch = r.branch ?? config.defaults?.branch;
      if (!branch) throw Error("Missing branch for " + r.name);
      return { name: r.name, branch };
    }),
  };
  const output =
    "matrix=" +
    JSON.stringify(matrix) +
    "\nsource_repository=" +
    config.source.repository +
    "\n";
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, output);
  else process.stdout.write(output);
} else {
  const output = arg("--output");
  if (!requested || !output)
    throw Error("--repository and --output are required");
  const existingPath = arg("--existing-files");
  const existingFiles = existingPath
    ? JSON.parse(readFileSync(existingPath, "utf8"))
    : undefined;
  if (
    existingFiles &&
    (!Array.isArray(existingFiles) ||
      existingFiles.some((x: unknown) => typeof x !== "string"))
  )
    throw Error("--existing-files must contain a JSON array of filenames");
  const publisherPath = arg("--destination-publish-file");
  const files = generateWorkflows({
    config,
    repository: requested,
    sourceRoot: resolve(arg("--source-root", ".")),
    output: resolve(output),
    workflow: arg("--workflow"),
    existingFiles,
    destinationPublish:
      publisherPath && existsSync(publisherPath)
        ? readFileSync(publisherPath, "utf8")
        : undefined,
  });
  process.stdout.write(JSON.stringify({ repository: requested, files }) + "\n");
}
