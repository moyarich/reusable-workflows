/** Format a git log into stable, deduplicated release-note bullets. */
export function formatReleaseCommits(output: string): string {
  if (!output) return "";
  const excludedTypes = /* @__PURE__ */ new Set([
    "docs",
    "build",
    "ci",
    "test",
    "style",
    "chore",
    "refactor",
  ]);
  const seen = /* @__PURE__ */ new Set();
  const entries: string[] = [];
  for (const row of output.split("\n")) {
    const [rawSubject, hash = ""] = row.split("	", 2);
    const subject = rawSubject?.trim();
    if (!subject || /^release(?:\([^)]*\))?:/i.test(subject)) continue;
    const match = subject.match(
      /^(feat|fix|perf|refactor|docs|build|ci|test|style|chore)(?:\([^)]*\))?!?:\s*(.+)$/i,
    );
    const type = match?.[1]?.toLowerCase() ?? "";
    const summary = (match?.[2] ?? subject).replace(/\s*\(#\d+\)$/, "").trim();
    if (!summary || excludedTypes.has(type)) continue;
    const key = summary.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(hash ? `- ${summary} (${hash})` : `- ${summary}`);
  }
  return entries.join("\n");
}
