#!/usr/bin/env node
import { Command } from "commander";
import { spawnSync } from "node:child_process";
const program = new Command().name("reusable-workflows").description("Reusable Workflows command line utilities").version("0.2.2");
program.command("browser").description("Browser extension publisher").allowUnknownOption().allowExcessArguments().argument("[args...]").action((args: string[]) => {
  const result = spawnSync("node", ["actions/dist/browser-extension-publish.mjs", ...args], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
});
await program.parseAsync();
