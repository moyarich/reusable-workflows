/** Pure release-note extraction and content classification. */
export function changelogSection(markdown: string, version: string) {
  if (!version) return "";
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const heading = new RegExp(
    "^##\\s+\\[?" + escaped + "\\]?(?:\\s+-\\s+.+)?\\s*$",
  );
  const notes: string[] = [];
  let collecting = false;
  for (const line of markdown.split("\n")) {
    if (!collecting && heading.test(line.trim())) {
      collecting = true;
      continue;
    }
    if (collecting && /^##\s+/.test(line)) break;
    if (collecting) notes.push(line);
  }
  return notes.join("\n").trim();
}
export function hasMeaningfulGeneratedBody(body: string) {
  return (
    body
      .replace(/[*-]\s*No changes\.?/gi, "")
      .replace(/#+\s*(Changes|Release notes|What's Changed)/gi, "")
      .trim().length > 0
  );
}
