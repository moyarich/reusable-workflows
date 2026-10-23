/** Executable entrypoint for release identity validation action. */
import { runAction } from "./index.js";

try {
  runAction();
} catch (error) {
  console.error(
    "::error::" + (error instanceof Error ? error.message : String(error)),
  );
  process.exitCode = 1;
}
