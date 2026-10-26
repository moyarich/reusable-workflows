import { appendFileSync } from "node:fs";

type Package = { name?: string; directory?: string; version?: string };
export function runSyncReleaseSummary(): void {
  const env = process.env;

  function parseJson<T>(value: string | undefined, fallback: T): T {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  function packages(value: string | undefined): Package[] {
    const parsed = parseJson<{ included?: Package[] }>(value, {});
    return Array.isArray(parsed.included) ? parsed.included : [];
  }
  function safe(value: unknown): string {
    return String(value ?? "")
      .replaceAll("|", "\\|")
      .replaceAll("\n", " ");
  }

  const release = packages(env.RELEASE_PACKAGES_JSON);
  const publish = packages(env.PUBLISH_PACKAGES_JSON);
  const configured = parseJson<string[]>(env.WORKFLOW_FILES, []);
  const files = configured.length ? configured : [env.WORKFLOW_FILE ?? ""];
  const result = env.SYNC_RESULT || "failed or skipped";

  const rows: string[] = [
    "# Release package choice synchronization",
    "",
    `**Result:** ${safe(result)}`,
    "",
    "| Stage | Status |",
    "| --- | --- |",
    ...(
      [
        ["Release discovery", "DISCOVER_RELEASE_STATUS"],
        ["npm discovery", "DISCOVER_PUBLISH_STATUS"],
        ["Update workflow choices", "UPDATE_STATUS"],
        ["Commit and push", "COMMIT_STATUS"],
      ] as const
    ).map(([label, key]) => `| ${label} | ${safe(env[key] ?? "unknown")} |`),
    "",
    `**Release-eligible packages:** ${release.length}`,
    "",
    `**npm-eligible packages:** ${publish.length}`,
    "",
    "| Package | Directory | Version |",
    "| --- | --- | --- |",
    ...release.map(
      (pkg) =>
        `| \`${safe(pkg.name)}\` | \`${safe(pkg.directory)}\` | \`${safe(pkg.version)}\` |`,
    ),
    "",
    "**Configured workflow files (not necessarily modified):**",
    "",
    ...files.filter(Boolean).map((file) => `- \`${safe(file)}\``),
  ];
  if (env.COMMIT_SHA) rows.push("", `**Commit:** \`${safe(env.COMMIT_SHA)}\``);
  const summary = rows.join("\n") + "\n";
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, summary);
  else process.stdout.write(summary);
}
