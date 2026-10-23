/** Release body decisions with all external data supplied by the caller. */
import { hasMeaningfulGeneratedBody } from "./release-note-rules.js";
import {
  splitGeneratedRegion,
  pullRequestMarkers,
  generatedEntries,
  appendCategoryEntries,
  mergeGeneratedEntries,
  generatedRegion,
  ensureMetadata,
} from "./reconcile-rules.js";

export type ReleaseBodyInputs = {
  existingBody: string;
  generatedBody: string;
  curatedNotes: string;
  commitNotes: string;
  targetKey: string;
  seedSha: string;
};

function resolveInitialSeed(options: ReleaseBodyInputs) {
  if (options.curatedNotes)
    return { source: "changelog", body: options.curatedNotes };
  const generated = options.generatedBody.trim();
  if (hasMeaningfulGeneratedBody(generated)) {
    return { source: "release-drafter", body: generatedRegion(generated) };
  }
  const commits = options.commitNotes;
  if (commits) {
    return {
      source: "commits",
      body: `## Release notes

${commits}`,
    };
  }
  return { source: "minimal", body: "## Release notes\n\nInitial release." };
}
export function reconcileReleaseBody(options: ReleaseBodyInputs): string {
  const existing = options.existingBody.trim();
  const generated = options.generatedBody.trim();

  // A release-specific curated changelog is the source of truth for public
  // notes. Do not reintroduce internal PR titles or stale install commands
  // from persistent Release Drafter output on subsequent runs.
  if (options.curatedNotes) {
    const curated = options.curatedNotes;
    const existingSeed = existing.match(
      /<!--\\s*release-draft-sync:seed-sha=([^\\s]+)(?:\\s+source=[^>]+)?\\s*-->/,
    );
    const seedSha = existingSeed?.[1] || options.seedSha;
    return ensureMetadata(curated, options.targetKey, seedSha, "changelog");
  }
  if (!existing) {
    const seed = resolveInitialSeed(options);
    return ensureMetadata(
      seed.body,
      options.targetKey,
      options.seedSha,
      seed.source,
    );
  }
  let body = existing;
  const split = splitGeneratedRegion(body);
  if (hasMeaningfulGeneratedBody(generated)) {
    if (split) {
      const mergedGenerated = mergeGeneratedEntries(split.generated, generated);
      body = [split.before, generatedRegion(mergedGenerated), split.after]
        .filter(Boolean)
        .join("\n\n");
    } else {
      const existingMarkers = pullRequestMarkers(body);
      let managed = "";
      for (const [category, entries] of generatedEntries(generated)) {
        const missing = entries.filter((entry) => {
          const match = entry.match(/release-draft-sync:pr=(\d+)/);
          return match && !existingMarkers.has(match[1]);
        });
        managed = appendCategoryEntries(managed, category, missing);
      }
      if (managed) {
        body = `${body.trim()}

${generatedRegion(managed)}`;
      }
    }
  }
  return ensureMetadata(body, options.targetKey, options.seedSha, "existing");
}
