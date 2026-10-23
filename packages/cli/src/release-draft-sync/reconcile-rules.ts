/** Deterministic release draft entry merging and metadata rules. */
const GENERATED_START = "<!-- release-draft-sync:generated:start -->";
const GENERATED_END = "<!-- release-draft-sync:generated:end -->";
export function splitGeneratedRegion(body: string) {
  const start = body.indexOf(GENERATED_START);
  const end = body.indexOf(GENERATED_END);
  if (start < 0 || end < 0 || end < start) return null;
  return {
    before: body.slice(0, start).trimEnd(),
    generated: body.slice(start + GENERATED_START.length, end).trim(),
    after: body.slice(end + GENERATED_END.length).trimStart(),
  };
}
export function pullRequestMarkers(body: string) {
  const markers = new Set<string>();
  for (const match of body.matchAll(
    /<!--\s*release-draft-sync:pr=(\d+)\s*-->/g,
  )) {
    markers.add(match[1]);
  }
  return markers;
}
export function generatedEntries(body: string) {
  const groups = new Map<string, string[]>();
  let category = "Changes";
  for (const line of body.trim().split("\n")) {
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) {
      category = heading[1];
      continue;
    }
    if (/^\s*[-*]\s+.+<!--\s*release-draft-sync:pr=\d+\s*-->\s*$/.test(line)) {
      const entries = groups.get(category) ?? [];
      entries.push(line.trim());
      groups.set(category, entries);
    }
  }
  return groups;
}
export function appendCategoryEntries(
  markdown: string,
  category: string,
  entries: string[],
) {
  if (!entries.length) return markdown;
  const source = markdown.trim();
  const heading = `### ${category}`;
  if (!source)
    return `${heading}

${entries.join("\n")}`;
  const lines = source.split("\n");
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex < 0) {
    return `${source}

${heading}

${entries.join("\n")}`;
  }
  let insertAt = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (/^###\s+/.test(lines[index])) {
      insertAt = index;
      break;
    }
  }
  const prefix = lines.slice(0, insertAt);
  while (prefix.length && prefix.at(-1) === "") prefix.pop();
  return [...prefix, ...entries, "", ...lines.slice(insertAt)]
    .join("\n")
    .trim();
}
export function mergeGeneratedEntries(
  existingGenerated: string,
  latestGenerated: string,
) {
  let merged = existingGenerated.trim();
  const seen = pullRequestMarkers(merged);
  for (const [category, entries] of generatedEntries(latestGenerated)) {
    const missing = entries.filter((entry) => {
      const match = entry.match(/release-draft-sync:pr=(\d+)/);
      return match && !seen.has(match[1]);
    });
    for (const entry of missing) {
      const match = entry.match(/release-draft-sync:pr=(\d+)/);
      if (match) seen.add(match[1]);
    }
    merged = appendCategoryEntries(merged, category, missing);
  }
  return merged;
}
export function generatedRegion(body: string) {
  return [GENERATED_START, body.trim(), GENERATED_END]
    .filter(Boolean)
    .join("\n\n");
}
export function ensureMetadata(
  body: string,
  targetKey: string,
  seedSha: string,
  source: string,
) {
  let result = body.trim();
  if (!/<!--\s*release-draft-sync:target=/.test(result)) {
    result = `<!-- release-draft-sync:target=${targetKey} -->
${result}`;
  }
  if (seedSha && !/<!--\s*release-draft-sync:seed-sha=/.test(result)) {
    result = result.replace(
      /^(<!--\s*release-draft-sync:target=.*?-->)/,
      `$1
<!-- release-draft-sync:seed-sha=${seedSha} source=${source} -->`,
    );
  }
  return result.trim();
}
