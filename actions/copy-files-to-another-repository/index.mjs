import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { appendFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
// ../cli/src/copy-files-to-another-repository/index.ts
function validateOptions(o) {
	if (!/^[\w.-]+\/[\w.-]+$/.test(o.sourceRepository) || o.sourceRepository.split("/").some((part) => part === "." || part === "..")) throw new Error("Invalid source repository");
	if (!/^[\w.-][\w./-]*$/.test(o.sourceRef) || o.sourceRef.includes("..") || o.sourceRef.includes("//")) throw new Error("Invalid source ref");
	const parts = o.repository.split("/");
	if (parts.length !== 2 || parts.some((part) => !part || part === "." || part === "..") || !/^[\w.-]+\/[\w.-]+$/.test(o.repository)) throw new Error("Invalid repository");
	if (!/^[\w.-][\w./-]*$/.test(o.branch) || o.branch.includes("..") || o.branch.includes("//")) throw new Error("Invalid branch");
	if (o.mode !== void 0 && !["pull-request", "update-branch"].includes(o.mode)) throw new Error("Invalid copy mode");
	if (!o.token) throw new Error("Destination token is required");
	if (!existsSync(o.sourceDirectory) || !statSync(o.sourceDirectory).isDirectory()) throw new Error("Source directory not found");
	if (!readdirSync(o.sourceDirectory).length) throw new Error("Source directory is empty");
}
function copyFiles(options) {
	validateOptions(options);
	const temp = mkdtempSync(join(tmpdir(), "copy-repository-"));
	const destination = join(temp, "destination");
	const auth = "AUTHORIZATION: basic " + Buffer.from("x-access-token:" + options.token).toString("base64");
	const mode = options.mode ?? "pull-request";
	let pullRequestBranch = "automation/copy-workflows-" + createHash("sha256").update(JSON.stringify([
		options.sourceRepository,
		options.sourceRef,
		options.branch
	])).digest("hex").slice(0, 16);
	const git = (...args) => execFileSync("git", args, {
		cwd: destination,
		encoding: "utf8",
		stdio: [
			"ignore",
			"pipe",
			"pipe"
		]
	});
	const authenticatedGit = (...args) => git("-c", "http.extraheader=" + auth, ...args);
	const github = (...args) => execFileSync("gh", args, {
		cwd: destination,
		encoding: "utf8",
		env: {
			...process.env,
			GH_TOKEN: options.token
		},
		stdio: [
			"ignore",
			"pipe",
			"pipe"
		]
	});
	const existingPullRequest = () => JSON.parse(github("pr", "list", "--repo", options.repository, "--base", options.branch, "--head", pullRequestBranch, "--state", "open", "--json", "url,title", "--jq", ".[0] // {}").trim());
	try {
		execFileSync("git", [
			"-c",
			"http.extraheader=" + auth,
			"clone",
			"--depth",
			"1",
			"--branch",
			options.branch,
			"https://github.com/" + options.repository + ".git",
			destination
		], { stdio: [
			"ignore",
			"pipe",
			"pipe"
		] });
		let existingBranch = false;
		let pullRequestUrl;
		let pullRequestTitle;
		let pullRequestStatus;
		if (mode === "pull-request") {
			existingBranch = Boolean(authenticatedGit("ls-remote", "--heads", "origin", "refs/heads/" + pullRequestBranch).trim());
			if (existingBranch) {
				const existing = existingPullRequest();
				pullRequestUrl = existing.url;
				pullRequestTitle = existing.title;
				if (pullRequestUrl) pullRequestStatus = "existing";
				if (!pullRequestUrl) {
					pullRequestBranch += "-" + randomUUID().slice(0, 8);
					existingBranch = false;
				}
			}
			if (existingBranch) {
				authenticatedGit("fetch", "--depth", "1", "origin", "refs/heads/" + pullRequestBranch);
				git("checkout", "-B", pullRequestBranch, "FETCH_HEAD");
			} else git("checkout", "-b", pullRequestBranch);
		}
		for (const name of readdirSync(options.sourceDirectory)) {
			if (name === ".git") throw new Error("Refusing to copy .git");
			if (lstatSync(resolve(options.sourceDirectory, name)).isSymbolicLink()) throw new Error("Refusing symbolic-link source: " + name);
			const target = join(destination, name);
			mkdirSync(dirname(target), { recursive: true });
			cpSync(resolve(options.sourceDirectory, name), target, {
				recursive: true,
				force: true,
				dereference: false
			});
		}
		git("add", "-A");
		const changed = git("diff", "--cached", "--name-only").trim().length > 0;
		const summary = changed ? git("diff", "--cached", "--stat") : "No changes";
		if (options.dryRun) return {
			changed,
			committed: false,
			summary,
			pullRequestUrl,
			pullRequestTitle,
			pullRequestStatus
		};
		if (!changed) return {
			changed,
			committed: false,
			summary,
			pullRequestUrl,
			pullRequestTitle,
			pullRequestStatus
		};
		git("config", "user.name", "github-actions[bot]");
		git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com");
		git("commit", "-m", options.message);
		authenticatedGit("push", "origin", "HEAD:" + (mode === "pull-request" ? pullRequestBranch : options.branch));
		pullRequestUrl = mode === "pull-request" ? pullRequestUrl || github("pr", "create", "--repo", options.repository, "--base", options.branch, "--head", pullRequestBranch, "--title", options.message, "--body", `Synchronize prepared files from ${options.sourceRepository} at ${options.sourceRef}.`).trim() : void 0;
		if (mode === "pull-request" && pullRequestStatus !== "existing") {
			pullRequestTitle = options.message;
			pullRequestStatus = "created";
		}
		return {
			changed: true,
			committed: true,
			summary,
			pullRequestUrl,
			pullRequestTitle,
			pullRequestStatus
		};
	} finally {
		rmSync(temp, {
			recursive: true,
			force: true
		});
	}
}
function runCopyAction() {
	const dryRun = process.env.COPY_DRY_RUN ?? "true";
	if (dryRun !== "true" && dryRun !== "false") throw new Error("dry-run must be true or false");
	const result = copyFiles({
		mode: process.env.COPY_MODE ?? "pull-request",
		sourceRepository: process.env.COPY_SOURCE_REPO ?? "",
		sourceRef: process.env.COPY_SOURCE_REF ?? "main",
		sourceDirectory: process.env.COPY_SOURCE ?? "",
		repository: process.env.COPY_DEST ?? "",
		branch: process.env.COPY_BRANCH ?? "main",
		token: process.env.COPY_TOKEN ?? "",
		dryRun: dryRun === "true",
		message: process.env.COPY_MESSAGE ?? "chore: synchronize repository files"
	});
	if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, "changed=" + result.changed + "\ncommitted=" + result.committed + "\npull-request-url=" + (result.pullRequestUrl ?? "") + "\npull-request-title=" + (result.pullRequestTitle ?? "") + "\npull-request-status=" + (result.pullRequestStatus ?? "") + "\n");
	if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, "### " + process.env.COPY_DEST + "\n" + (result.pullRequestUrl ? `PR: [${result.pullRequestTitle ?? "Existing pull request"}](${result.pullRequestUrl}) (${result.pullRequestStatus})\n\n` : "") + "```\n" + result.summary + "\n```\n");
}
// ../cli/src/copy-files-to-another-repository/action-entry.ts
runCopyAction();
export {};
