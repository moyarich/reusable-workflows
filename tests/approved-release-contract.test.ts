import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = (name: string) =>
  readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), "utf8");

describe("approved-release workflow contract", () => {
  it("preserves caller-safe nested workflow routing and dry-run protections", () => {
    const approved = workflow("reusable_approved-release");
    const verify = workflow("reusable_verify-release-preparation");
    const release = workflow("reusable_release");

    // Nested calls must resolve in reusable-workflows, not in the external caller.
    expect(approved).toContain("uses: $/.github/workflows/reusable_verify-release-preparation.yml");
    expect(approved).toContain("uses: $/.github/workflows/reusable_release.yml");
    expect(release).toContain("uses: $/.github/workflows/reusable_dispatch-input-summary.yml");

    // Caller tokens remain an explicit part of the workflow_call interface.
    expect(approved).toMatch(/secrets:\s*\n\s*npm-token:\s*\n\s*required: false/);

    // Verify the exact merged commit and prior successful PR CI.
    expect(verify).toContain("github.event.pull_request.merged == true");
    expect(verify).toContain("github.event.pull_request.merge_commit_sha");
    expect(verify).toContain("github.event.pull_request.head.sha");
    expect(verify).toContain("uses: ./.github/reusable-workflows-runtime/actions/verify-workflow-runs");
    expect(verify).toContain("ref: ${{ job.workflow_sha }}");

    // An approved-release dry run must propagate to the release implementation.
    expect(approved).toContain("dry-run: ${{ inputs.dry-run }}");
    expect(release).toContain("if: ${{ !inputs.dry-run && inputs.create-tag");
    expect(release).toContain("if: ${{ !inputs.dry-run && inputs.update-major-tag");
    expect(release).toContain("if: ${{ !inputs.dry-run }}");
  });
});
