/** Interactive CLI prompting utilities. @module */
import { spawnSync } from "node:child_process";
import process from "node:process";
import { createInterface } from "node:readline/promises";

export interface PromptChoice<T extends string = string> {
  name: string;
  value: T;
}

export function assertInteractive(): void {
  if (process.env.CI || !process.stdin.isTTY || !process.stderr.isTTY) {
    throw new Error(
      "Interactive selection requires a TTY and is unavailable in CI. Pass explicit options instead.",
    );
  }
}

function hasFzf(): boolean {
  const probe = spawnSync("fzf", ["--version"], { stdio: "ignore" });
  return !probe.error && probe.status === 0;
}


/** Read a response from the controlling terminal without third-party runtime dependencies. */
async function readAnswer(message: string): Promise<string> {
  const terminal = createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  try {
    return (await terminal.question(message)).trim();
  } finally {
    terminal.close();
  }
}

/** Choose one of the provided options using a numbered terminal menu. */
export async function chooseOne<T extends string>(
  choices: PromptChoice<T>[],
  message: string,
): Promise<T | undefined> {
  assertInteractive();
  if (!choices.length) return undefined;
  process.stderr.write(`${message}\n`);
  choices.forEach((choice, index) => {
    process.stderr.write(`  ${index + 1}. ${choice.name}\n`);
  });
  while (true) {
    const answer = await readAnswer("Choice (blank to cancel): ");
    if (!answer) return undefined;
    const index = Number(answer) - 1;
    if (Number.isInteger(index) && index >= 0 && index < choices.length) {
      return choices[index].value;
    }
    process.stderr.write("Enter a number from the list.\n");
  }
}

/** Use fzf for large interactive collections; numbered terminal input is the fallback. */
export async function selectMany<T extends string>(
  choices: PromptChoice<T>[],
  message: string,
): Promise<T[]> {
  assertInteractive();
  if (!choices.length) return [];
  if (hasFzf()) {
    const result = spawnSync(
      "fzf",
      [
        "--multi",
        "--delimiter=\t",
        "--with-nth=2..",
        "--prompt",
        message + "> ",
        "--header",
        "TAB toggles selection; ENTER confirms",
      ],
      {
        input:
          choices.map((choice, i) => `${i}\t${choice.name}`).join("\n") + "\n",
        encoding: "utf8",
        stdio: ["pipe", "pipe", "inherit"],
      },
    );
    if (result.status === 1 || result.status === 130) return [];
    if (result.error || result.status !== 0)
      throw new Error(`fzf failed: ${result.error?.message ?? result.status}`);
    return result.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const index = Number(line.split("\t", 1)[0]);
        if (!Number.isInteger(index) || index < 0 || index >= choices.length)
          throw new Error("Invalid fzf selection");
        return choices[index].value;
      });
  }
  const selected: T[] = [];
  const remaining = [...choices];
  while (remaining.length) {
    const choice = await chooseOne(
      remaining,
      `${message} (select one at a time; blank to finish)`,
    );
    if (choice === undefined) break;
    selected.push(choice);
    remaining.splice(
      remaining.findIndex((item) => item.value === choice),
      1,
    );
  }
  return selected;
}

export async function confirm(
  message: string,
  defaultValue = false,
): Promise<boolean> {
  assertInteractive();
  const answer = await readAnswer(
    `${message} ${defaultValue ? "[Y/n]" : "[y/N]"}: `,
  );
  return answer ? ["y", "yes"].includes(answer.toLowerCase()) : defaultValue;
}

export async function askText(
  message: string,
  defaultValue = "",
): Promise<string> {
  assertInteractive();
  const answer = await readAnswer(
    `${message}${defaultValue ? ` [${defaultValue}]` : ""}: `,
  );
  return answer || defaultValue;
}
