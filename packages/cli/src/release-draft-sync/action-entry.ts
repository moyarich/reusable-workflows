/** Executable entrypoint for the release draft sync action. */
import { runAction } from "./index.js";

try {
  runAction();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`release-draft-sync: ${message}\n`);
  process.exitCode = 1;
}
