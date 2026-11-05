import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  fileURLToPath(new URL("../../../../.github/workflows/reusable_actionlint.yml", import.meta.url)),
  "utf8",
);

describe("reusable Actionlint installation", () => {
  it("falls back to the pinned Go module when the release archive is unavailable", () => {
    expect(workflow).toContain("ACTIONLINT_VERSION='1.7.12'");
    expect(workflow).toContain("curl --fail --location --retry 3 --retry-all-errors");
    expect(workflow).toContain("tar -xzf");
    expect(workflow).toContain('GOBIN="$RUNNER_TEMP/actionlint-bin" go install "github.com/rhysd/actionlint/cmd/actionlint@v$ACTIONLINT_VERSION"');
    expect(workflow).toContain('if [ ! -x "$ACTIONLINT" ]; then');
    expect(workflow).toContain("::warning title=Actionlint download unavailable");
  });

  it("still runs strict lint validation with the installed binary", () => {
    expect(workflow).toContain('"$ACTIONLINT" -config-file "$CONFIG"');
    expect(workflow).toContain('exit "$status"');
    expect(workflow).toContain("Workflow validation and suppression summary");
  });
});
