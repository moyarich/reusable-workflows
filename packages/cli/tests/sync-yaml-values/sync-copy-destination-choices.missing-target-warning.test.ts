import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflow = parse(
  readFileSync(
    new URL(
      "../../../../.github/workflows/sync_copy-destination-choices.yml",
      import.meta.url,
    ),
    "utf8",
  ),
);

describe("copy destination choice synchronization", () => {
  it.each(["sync", "validate"])(
    "warns and skips updates for an absent target in %s",
    (job) => {
      const steps: Array<{
        name?: string;
        id?: string;
        if?: string;
        run?: string;
        uses?: string;
      }> = workflow.jobs[job].steps;
      const guard = steps.find((step) => step.id === "target");
      expect(guard?.run).toContain(
        "[[ -f .github/workflows/copy-files-to-another-repository.yml ]]",
      );
      expect(guard?.run).toContain('echo "exists=false" >> "$GITHUB_OUTPUT"');
      expect(guard?.run).toContain(
        "::warning file=.github/workflows/copy-files-to-another-repository.yml::",
      );
      const targetSteps = steps.slice(steps.indexOf(guard!) + 1);
      expect(targetSteps.length).toBeGreaterThan(0);
      for (const step of targetSteps) {
        expect(step.if, step.name ?? step.uses).toBe(
          "steps.target.outputs.exists == 'true'",
        );
      }
    },
  );
});
