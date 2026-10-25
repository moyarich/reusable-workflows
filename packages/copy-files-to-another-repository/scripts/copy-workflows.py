#!/usr/bin/env python3
"""Generate only explicitly permitted canonical workflow updates."""
from __future__ import annotations

import argparse
import copy
import fnmatch
import json
from pathlib import Path

from ruamel.yaml import YAML

yaml = YAML()
yaml.preserve_quotes = True


def merge(target, patch, location=""):
    if not isinstance(patch, dict) or not isinstance(target, dict):
        return copy.deepcopy(patch)
    for key, value in patch.items():
        child = f"{location}.{key}" if location else str(key)
        if key not in target:
            raise ValueError(f"Override targets missing key: {child}")
        target[key] = merge(target[key], value, child)
    return target


def validate_patterns(value, label):
    if not isinstance(value, list) or any(not isinstance(x, str) or not x or "/" in x or "\\" in x or ".." in x for x in value):
        raise ValueError(f"{label} must contain safe workflow filename patterns")
    return value


def matches(filename, patterns):
    return any(fnmatch.fnmatchcase(filename, pattern) for pattern in patterns)


def publishing_kind(workflow_text):
    """Recognize publisher implementations; custom and single-package are distinct."""
    if "reusable_bulk-npm-publish.yml" in workflow_text:
        return "npm-monorepo"
    if "reusable_npm-publish.yml" in workflow_text:
        return "npm-single"
    if "reusable_vscode-publish.yml" in workflow_text:
        return "vscode"
    if "reusable_browser-extension-publish.yml" in workflow_text:
        return "browser"
    return "custom"


def build(config_file: Path, repository: str, output: Path, existing_files=None, destination_publish=None):
    config = yaml.load(config_file)
    # Support the original flat source-files config for existing generator users.
    if "source" in config:
        source = config["source"]
        if source.get("directory") != ".github/workflows":
            raise ValueError("Only .github/workflows source directory is allowed")
        include_patterns = validate_patterns(source.get("include", []), "source.include")
        exclude_patterns = validate_patterns(source.get("exclude", []), "source.exclude")
        if not include_patterns:
            raise ValueError("source.include must not be empty")
        files = [
            str(p) for p in sorted(Path(".github/workflows").glob("*.yml"))
            if matches(p.name, include_patterns) and not matches(p.name, exclude_patterns)
        ]
    else:
        files = config["source-files"]
        if not isinstance(files, list) or not files or len(files) != len(set(files)):
            raise ValueError("source-files must be a nonempty list without duplicates")
        for file in files:
            if not isinstance(file, str) or not file.startswith(".github/workflows/") or "/" in file.removeprefix(".github/workflows/"):
                raise ValueError(f"Unsafe source path: {file}")
        for file in files:
            if not Path(file).is_file():
                raise ValueError(f"Missing source workflow: {file}")

    destination = config.get("destination-directory", ".github/workflows")
    if destination != ".github/workflows":
        raise ValueError("Only .github/workflows destination is allowed")
    repositories = config["repositories"]
    if not isinstance(repositories, list) or not repositories:
        raise ValueError("repositories must be a nonempty list")
    targets = [r for r in repositories if r["name"] == repository]
    if len(targets) != 1:
        raise ValueError(f"Expected exactly one repository config for {repository}")
    target = targets[0]
    include = validate_patterns(target.get("include", ["*.yml"]), "include")
    exclude = validate_patterns(target.get("exclude", []), "exclude")
    create = validate_patterns(target.get("create-files", []), "create-files")
    overrides = target.get("overrides", {})
    if not isinstance(overrides, dict):
        raise ValueError("overrides must be a mapping")
    allowed = {Path(f).name for f in files}
    if any(key not in files for key in overrides):
        raise ValueError("overrides must reference available canonical source-files")
    selected = [
        f for f in files
        if matches(Path(f).name, include) and not matches(Path(f).name, exclude)
    ]
    if any(f not in selected for f in overrides):
        raise ValueError("overrides cannot target excluded files")
    existing = None if existing_files is None else set(existing_files)
    if existing is not None:
        selected = [f for f in selected if Path(f).name in existing or matches(Path(f).name, create)]
    # Never replace an existing publisher with a different publishing contract.
    # The destination workflow is fetched from the target branch, not guessed
    # from package names or repository names.
    if ".github/workflows/publish.yml" in selected:
        if destination_publish is None:
            raise ValueError("Destination publish.yml content required for compatibility validation")
        source_kind = publishing_kind(Path(".github/workflows/publish.yml").read_text())
        dest_kind = publishing_kind(destination_publish)
        if source_kind != dest_kind:
            raise ValueError(
                f"Incompatible publish.yml for {repository}: destination={dest_kind}, "
                f"canonical={source_kind}; use a dedicated canonical publisher"
            )
    # A template package selector cannot safely replace a real package list
    # unless the destination maintains choices through its sync caller.
    selector_files = [
        f for f in selected if Path(f).name in
        ("publish.yml", "release.yml", "release-draft.yml",
         "restore-release.yml", "reset-release.yml", "check-dist.yml")
        and "packages/example" in Path(f).read_text()
    ]
    if selector_files and existing is not None:
        sync = "sync-release-package-choices.yml"
        has_sync_update = sync in {Path(f).name for f in selected}
        if not has_sync_update:
            # Do not block unrelated CI updates for repositories that have
            # a custom selector process. Preserve their existing release files.
            selected = [f for f in selected if f not in selector_files]
            print(json.dumps({
                "repository": repository,
                "preserved-package-selectors": selector_files,
                "reason": "canonical package-choice synchronizer not selected",
            }))
    result = []
    for source in selected:
        path = Path(source)
        if not path.is_file() or not path.is_file() or path.is_symlink():
            raise ValueError(f"Missing or unsafe source workflow: {source}")
        if path.name not in allowed:
            raise ValueError(f"Unsafe source file: {source}")
        dst = output / destination / path.name
        dst.parent.mkdir(parents=True, exist_ok=True)
        if source in overrides:
            document = yaml.load(path)
            patch = overrides[source]
            if not isinstance(patch, dict) or any(k not in ("on", "jobs", "env", "defaults", "name", "run-name") for k in patch):
                raise ValueError(f"Unsafe workflow override: {source}")
            merge(document, patch)
            with dst.open("w") as handle:
                yaml.dump(document, handle)
        else:
            dst.write_bytes(path.read_bytes())
        result.append(str(Path(destination) / path.name))
    print(json.dumps({"repository": repository, "files": result, "excluded": sorted(set(files) - set(selected))}))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=Path(".github/copy.yml"))
    parser.add_argument("--repository", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--existing-files", type=Path)
    parser.add_argument("--destination-publish-file", type=Path)
    args = parser.parse_args()
    existing = json.loads(args.existing_files.read_text()) if args.existing_files else None
    if existing is not None and (not isinstance(existing, list) or not all(isinstance(x, str) for x in existing)):
        parser.error("--existing-files must contain a JSON array of filenames")
    publish = args.destination_publish_file.read_text() if args.destination_publish_file else None
    build(args.config, args.repository, args.output, existing, publish)
