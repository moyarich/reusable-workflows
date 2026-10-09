/** Shared, dependency-free parser for persistent GitHub Release metadata. */
export interface ReleaseIdentity {
  package: string;
  version: string;
  tag: string;
  target: string;
  "seed-sha"?: string;
  source?: string;
}

export type ReleaseMarker =
  | ({ format: "v2" } & ReleaseIdentity)
  | { format: "legacy"; target?: string; "seed-sha"?: string; source?: string }
  | { format: "none" };

const markerPattern = /<!-- release-draft-sync:v2\n([\s\S]*?)\n-->/g;
const legacyTarget = /<!--\s*release-draft-sync:target=([^\s>]+)\s*-->/;
const legacySeed = /<!--\s*release-draft-sync:seed-sha=([^\s>]+)(?:\s+source=([^\s>]+))?\s*-->/;
const fields = ["package", "version", "tag", "target", "seed-sha", "source"];
export function parseReleaseMarker(body: string = ""): Exclude<ReleaseMarker, { format: "none" }> | null {
  const matches = [...body.matchAll(markerPattern)];
  if (matches.length > 1) throw new Error("Multiple release identity markers found.");
  if (matches.length === 1) {
    const data: Record<string, string> = {};
    for (const line of matches[0][1].split("\n")) {
      const at = line.indexOf("=");
      if (at < 1) throw new Error("Invalid release identity field: " + line);
      const key = line.slice(0, at), value = line.slice(at + 1);
      if (!fields.includes(key) || key in data || !value) throw new Error("Invalid or duplicate identity field: " + key);
      data[key] = value;
    }
    for (const key of fields.slice(0, 4)) if (!data[key]) throw new Error("Missing release identity field: " + key);
    return { format: "v2", ...data } as { format: "v2" } & ReleaseIdentity;
  }
  const target = body.match(legacyTarget)?.[1];
  const seed = body.match(legacySeed);
  return target || seed ? { format: "legacy", target, "seed-sha": seed?.[1], source: seed?.[2] } : null;
}
export function validateReleaseMarker(body: string, expected: Partial<ReleaseIdentity>): ReleaseMarker {
  const marker = parseReleaseMarker(body);
  if (!marker) return { format: "none" };
  if (marker.format === "v2") {
    for (const key of ["package", "version", "tag", "target"]) {
      const field = key as keyof ReleaseIdentity;
      if (expected[field] && marker[field] !== expected[field]) throw new Error(`Release identity mismatch for ${key}: marker=${marker[field]} expected=${expected[field]}`);
    }
  } else if (expected.target && marker.target && marker.target !== expected.target && marker.target !== expected.package) {
    throw new Error("Legacy release target mismatch: " + marker.target);
  }
  return marker;
}
export function writeReleaseMarker(body: string, expected: ReleaseIdentity): string {
  const previous = validateReleaseMarker(body, expected);
  const data = {
    package: expected.package, version: expected.version, tag: expected.tag,
    target: expected.target,
    "seed-sha": ("seed-sha" in previous ? previous["seed-sha"] : undefined) || expected["seed-sha"],
    source: expected.source || ("source" in previous ? previous.source : undefined) || "existing"
  };
  for (const key of fields.slice(0, 4)) if (!data[key]) throw new Error("Missing expected release identity: " + key);
  const marker = "<!-- release-draft-sync:v2\n" + fields.filter(k => data[k]).map(k => k + "=" + data[k]).join("\n") + "\n-->";
  const clean = body.replace(markerPattern, "").replace(/<!--\s*release-draft-sync:target=[^>]*-->\s*/g, "").replace(/<!--\s*release-draft-sync:seed-sha=[^>]*-->\s*/g, "").trim();
  return marker + "\n\n" + clean;
}
