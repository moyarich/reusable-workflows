// The distribution bundler discovers each src/actions/* action through index.ts.
// check-dist runs as a composite action from select.mjs; importing its implementation
// also makes the action eligible for the repository's TypeScript distribution build.
import "./select.mjs";
