"""Regression coverage for canonical workflow selection and overrides."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

from ruamel.yaml import YAML

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/copy-workflows.py"
spec = importlib.util.spec_from_file_location("copy_workflows", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
yaml = YAML()


class CopierTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.source = self.root / ".github/workflows"
        self.source.mkdir(parents=True)
        (self.source / "ci_alpha.yml").write_text("name: Alpha\njobs:\n  test:\n    with:\n      enabled: true\n")
        (self.source / "sync-release-package-choices.yml").write_text("name: Release\n")
        self.config = self.root / ".github/copy.yml"
        self.output = self.root / "generated"
        self.original_cwd = Path.cwd()
        import os
        os.chdir(self.root)
        self.addCleanup(os.chdir, self.original_cwd)

    def write_config(self, *, overrides=None, include=None, exclude=None, files=None):
        target = {"name": "moyarich/github_emulator", "branch": "main"}
        if overrides is not None:
            target["overrides"] = overrides
        if include is not None:
            target["include"] = include
        if exclude is not None:
            target["exclude"] = exclude
        data = {
            "source-files": files or [".github/workflows/ci_alpha.yml", ".github/workflows/sync-release-package-choices.yml"],
            "repositories": [target],
        }
        with self.config.open("w") as handle:
            yaml.dump(data, handle)

    def test_selected_file_and_exclusion(self):
        self.write_config(include=[".github/workflows/sync-release-package-choices.yml"])
        selected = module.build(self.config, "moyarich/github_emulator", self.output)
        self.assertEqual(selected, [".github/workflows/sync-release-package-choices.yml"])
        self.assertFalse((self.output / ".github/workflows/ci_alpha.yml").exists())

    def test_excluded_file(self):
        self.write_config(exclude=[".github/workflows/ci_alpha.yml"])
        selected = module.build(self.config, "moyarich/github_emulator", self.output)
        self.assertEqual(len(selected), 1)

    def test_nested_override(self):
        path = ".github/workflows/ci_alpha.yml"
        self.write_config(include=[path], overrides={path: {"jobs": {"test": {"with": {"enabled": False}}}}})
        module.build(self.config, "moyarich/github_emulator", self.output)
        result = yaml.load(self.output / path)
        self.assertFalse(result["jobs"]["test"]["with"]["enabled"])

    def test_workflow_trigger_override(self):
        path = ".github/workflows/ci_alpha.yml"
        (self.source / "ci_alpha.yml").write_text("name: Alpha\n" + "on:\n  push:\n    paths:\n      - packages/**/package.json\n" + "jobs:\n  test:\n    with:\n      enabled: true\n")
        self.write_config(include=[path], overrides={path: {"on": {"push": {"paths": ["apps/**/package.json"]}}}})
        module.build(self.config, "moyarich/github_emulator", self.output)
        result = yaml.load(self.output / path)
        self.assertEqual(result["on"]["push"]["paths"], ["apps/**/package.json"])

    def test_unknown_override_key_rejected(self):
        path = ".github/workflows/ci_alpha.yml"
        self.write_config(include=[path], overrides={path: {"jobs": {"missing": {}}}})
        with self.assertRaisesRegex(ValueError, "missing key"):
            module.build(self.config, "moyarich/github_emulator", self.output)

    def test_missing_source_rejected(self):
        self.write_config(files=[".github/workflows/not-found.yml"])
        with self.assertRaisesRegex(ValueError, "Missing source"):
            module.build(self.config, "moyarich/github_emulator", self.output)

    def test_duplicate_source_rejected(self):
        path = ".github/workflows/ci_alpha.yml"
        self.write_config(files=[path, path])
        with self.assertRaisesRegex(ValueError, "duplicates"):
            module.build(self.config, "moyarich/github_emulator", self.output)

    def test_excluded_override_rejected(self):
        path = ".github/workflows/ci_alpha.yml"
        self.write_config(exclude=[path], overrides={path: {"name": "Updated"}})
        with self.assertRaisesRegex(ValueError, "excluded"):
            module.build(self.config, "moyarich/github_emulator", self.output)

    def test_unchanged_file_keeps_exact_bytes(self):
        self.write_config(include=[".github/workflows/ci_alpha.yml"])
        module.build(self.config, "moyarich/github_emulator", self.output)
        self.assertEqual((self.output / ".github/workflows/ci_alpha.yml").read_bytes(),
                         (self.source / "ci_alpha.yml").read_bytes())


    def test_globs_and_destination_existing_files(self):
        self.write_config()
        data = yaml.load(self.config)
        data.pop("source-files")
        data["source"] = {"directory": ".github/workflows", "include": ["ci_*.yml", "sync-*.yml"], "exclude": []}
        with self.config.open("w") as out:
            yaml.dump(data, out)
        result = module.build(self.config, "moyarich/github_emulator", self.output, ["ci_alpha.yml"])
        self.assertEqual(result, [".github/workflows/ci_alpha.yml"])

    def test_denylists_override_allowlists(self):
        self.write_config()
        data = yaml.load(self.config)
        data.pop("source-files")
        data["source"] = {"directory": ".github/workflows", "include": ["*.yml"], "exclude": ["sync-*.yml"]}
        data["repositories"][0]["exclude"] = ["ci_*.yml"]
        with self.config.open("w") as out:
            yaml.dump(data, out)
        result = module.build(self.config, "moyarich/github_emulator", self.output, ["ci_alpha.yml", "sync-release-package-choices.yml"])
        self.assertEqual(result, [])

    def test_explicit_creation_opt_in(self):
        self.write_config()
        data = yaml.load(self.config)
        data["repositories"][0]["create-files"] = ["sync-*.yml"]
        with self.config.open("w") as out:
            yaml.dump(data, out)
        result = module.build(self.config, "moyarich/github_emulator", self.output, [])
        self.assertEqual(result, [".github/workflows/sync-release-package-choices.yml"])

    def test_unsafe_glob_rejected(self):
        self.write_config()
        data = yaml.load(self.config)
        data.pop("source-files")
        data["source"] = {"directory": ".github/workflows", "include": ["../*.yml"]}
        with self.config.open("w") as out:
            yaml.dump(data, out)
        with self.assertRaisesRegex(ValueError, "safe workflow filename"):
            module.build(self.config, "moyarich/github_emulator", self.output)

    def test_incompatible_publisher_fails_closed(self):
        publisher = self.source / "publish.yml"
        publisher.write_text("uses: reusable_bulk-npm-publish.yml\\n")
        self.write_config(files=[".github/workflows/publish.yml"])
        with self.assertRaisesRegex(ValueError, "Incompatible publish.yml"):
            module.build(self.config, "moyarich/github_emulator", self.output,
                         ["publish.yml"], "uses: reusable_npm-publish.yml")

    def test_matching_publisher_allowed(self):
        publisher = self.source / "publish.yml"
        publisher.write_text("uses: reusable_bulk-npm-publish.yml\\n")
        self.write_config(files=[".github/workflows/publish.yml"])
        result = module.build(self.config, "moyarich/github_emulator", self.output,
                              ["publish.yml"], "uses: reusable_bulk-npm-publish.yml")
        self.assertEqual(result, [".github/workflows/publish.yml"])

    def test_template_selector_without_synchronizer_rejected(self):
        (self.source / "release.yml").write_text('options: [all, "packages/example"]\\n')
        self.write_config(files=[".github/workflows/release.yml"])
        selected = module.build(self.config, "moyarich/github_emulator", self.output, ["release.yml"])
        self.assertEqual(selected, [])

    def test_template_selector_with_canonical_synchronizer(self):
        (self.source / "release.yml").write_text('options: [all, "packages/example"]\\n')
        self.write_config(files=[".github/workflows/release.yml",
                                 ".github/workflows/sync-release-package-choices.yml"])
        selected = module.build(self.config, "moyarich/github_emulator", self.output,
                                ["release.yml", "sync-release-package-choices.yml"])
        self.assertEqual(len(selected), 2)

if __name__ == "__main__":
    unittest.main()
