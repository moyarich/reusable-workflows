import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const input = (name, fallback = "") =>
  process.env["INPUT_" + name.toUpperCase().replaceAll("-", "_")] ?? fallback;
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const mode = input("mode", "promote");
const dryRun = input("dry-run", "true") === "true";
const api = (endpoint, method = "GET", fields = {}) => {
  const args = ["api", endpoint];
  if (method !== "GET") args.push("--method", method);
  for (const [key, value] of Object.entries(fields))
    args.push(typeof value === "boolean" ? "-F" : "-f", key + "=" + value);
  return JSON.parse(
    execFileSync("gh", args, {
      encoding: "utf8",
      env: { ...process.env, GH_TOKEN: token },
    }),
  );
};
const get = (endpoint) => {
  try {
    return api(endpoint);
  } catch (error) {
    if (/404|Not Found/i.test(String(error.stderr ?? error.message)))
      return null;
    throw error;
  }
};
const publish = (name, value) => {
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, name + "=" + value + "\n");
};
const describe = (name) =>
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(name);
const versionCompare = (a, b) => {
  const x = describe(a).slice(1).map(Number),
    y = describe(b).slice(1).map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
};
const tagRef = (tag) =>
  get("repos/" + repository + "/git/ref/tags/" + encodeURIComponent(tag));
const resolveCommit = (ref) => {
  let obj = ref?.object;
  for (let depth = 0; depth < 5 && obj?.type === "tag"; depth++)
    obj = api("repos/" + repository + "/git/tags/" + obj.sha).object;
  if (obj?.type !== "commit" || !/^[a-f\d]{40}$/i.test(obj.sha))
    throw new Error("Tag does not resolve to a commit.");
  return obj.sha;
};
const move = (tag, sha) => {
  const old = tagRef(tag);
  if (old && resolveCommit(old) === sha) return "unchanged";
  if (dryRun) return old ? "would-update" : "would-create";
  if (old)
    api(
      "repos/" + repository + "/git/refs/tags/" + encodeURIComponent(tag),
      "PATCH",
      { sha, force: true },
    );
  else
    api("repos/" + repository + "/git/refs", "POST", {
      ref: "refs/tags/" + tag,
      sha,
    });
  return old ? "updated" : "created";
};
const release = (tag) =>
  get("repos/" + repository + "/releases/tags/" + encodeURIComponent(tag));

try {
  if (!repository || !token)
    throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN are required.");
  let tag, sha, outcome;
  if (mode === "promote") {
    const source = input("source-tag");
    const match = describe(source);
    if (!match)
      throw new Error("source-tag must be stable semver, e.g. v1.2.3");
    const published = release(source);
    if (!published || published.draft || published.prerelease)
      throw new Error(
        "Source tag must have a published stable GitHub release.",
      );
    const ref = tagRef(source);
    if (!ref) throw new Error("Source tag does not exist.");
    sha = resolveCommit(ref);
    tag = "v" + match[1];
    const all = api("repos/" + repository + "/releases?per_page=100");
    const eligible = all.filter(
      (r) =>
        !r.draft && !r.prerelease && describe(r.tag_name)?.[1] === match[1],
    );
    // An older release is never allowed to move the major compatibility alias.
    if (eligible.some((r) => versionCompare(r.tag_name, source) > 0))
      throw new Error(
        "A newer published stable release exists for " +
          tag +
          "; refusing to downgrade.",
      );
    outcome = move(tag, sha);
  } else if (mode === "restore") {
    tag = input("tag");
    sha = input("commit");
    if (
      !tag ||
      !/^[a-f\d]{40}$/i.test(sha) ||
      !/^[-\w./]+$/.test(tag) ||
      tag.includes("..") ||
      tag.startsWith("-")
    )
      throw new Error(
        "A safe tag name and full 40-character commit SHA are required.",
      );
    api("repos/" + repository + "/commits/" + sha);
    const targetBranch = input("target-branch", "main");
    if (input("require-branch-head") === "true") {
      const head = api(
        "repos/" +
          repository +
          "/git/ref/heads/" +
          encodeURIComponent(targetBranch),
      );
      if (head.object.sha !== sha)
        throw new Error("Target branch HEAD moved since resolution.");
    }
    const existingRelease = release(tag);
    if (
      existingRelease &&
      (!existingRelease.draft || existingRelease.immutable)
    )
      throw new Error(
        "Refusing to move a tag associated with a finalized or immutable release.",
      );
    outcome = move(tag, sha);
  } else throw new Error("Unknown mode: " + mode);
  publish("tag", tag);
  publish("commit", sha);
  publish("outcome", outcome);
  if (mode === "promote") publish("major-tag", tag);
  console.log([mode, tag, sha, outcome].join(" | "));
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      "## Release tag\n\nMode: " +
        mode +
        "\n\nTag: `" +
        tag +
        "`\n\nCommit: `" +
        sha +
        "`\n\nResult: " +
        outcome +
        "\n",
    );
} catch (e) {
  console.error("::error::" + e.message);
  process.exitCode = 1;
}
