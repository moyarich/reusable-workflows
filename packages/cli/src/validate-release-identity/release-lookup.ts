/** Pure selection of a GitHub Release by exact tag. */
export type ReleaseRecord = { tag_name?: string; body?: string | null };

export function findReleaseByTag(
  raw: string,
  tag: string,
): ReleaseRecord | undefined {
  const pages: unknown = JSON.parse(raw);
  if (!Array.isArray(pages))
    throw new Error("GitHub releases response must be an array");
  const releases: unknown[] = pages.flat();
  return releases.find(
    (value): value is ReleaseRecord =>
      value !== null &&
      typeof value === "object" &&
      (value as ReleaseRecord).tag_name === tag,
  ) as ReleaseRecord | undefined;
}
