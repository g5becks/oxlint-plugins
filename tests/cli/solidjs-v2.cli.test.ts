import { afterAll, describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ROOT,
  buildPlugin,
  cleanupConfig,
  markedLines,
  reportedLines,
  runOxlint,
  runOxlintWithFix,
  writeOxlintConfig,
} from "./helpers/cli-runner";

// Solid 2.0 (TASK-043 onward): each tests/cli/fixtures/solidjs-v2/<rule>.tsx is linted by real oxlint
// with only that rule and settings.solidjs.version 2; the reported lines must equal the lines
// marked `// report`. Rules that only exist for 2.0 must report nothing on it at version 1.
const DIR = join(ROOT, "tests", "cli", "fixtures", "solidjs-v2");
const FIXTURES = readdirSync(DIR)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => ({ rule: f.replace(/\.tsx$/, ""), file: join(DIR, f) }));

/** Rules that report nothing at version 1 (TASK-043: nothing is "removed" on 1.x). */
export const V2_ONLY_RULES = new Set<string>(["no-removed-apis", "effect-split"]);

const configs: string[] = [];
afterAll(async () => {
  for (const c of configs) await cleanupConfig(c);
});

async function lint(rule: string, file: string, version?: 2) {
  await buildPlugin("solidjs");
  const configPath = await writeOxlintConfig({
    plugins: ["solidjs"],
    rules: { [`solidjs/${rule}`]: "error" },
    ...(version ? { settings: { solidjs: { version } } } : {}),
  });
  configs.push(configPath);
  const result = await runOxlint({ configPath, files: [file] });
  expect(result.stderr).toBe("");
  return result.diagnostics.filter((d) => d.code === `solidjs(${rule})`);
}

describe("solidjs at settings.solidjs.version 2", () => {
  test("fixtures exist", () => {
    expect(FIXTURES.length).toBeGreaterThan(0);
  });

  for (const { rule, file } of FIXTURES) {
    test(`${rule}: reports exactly the marked lines`, async () => {
      expect(reportedLines(await lint(rule, file, 2))).toEqual(await markedLines(file));
    });

    if (V2_ONLY_RULES.has(rule)) {
      test(`${rule}: reports nothing at version 1`, async () => {
        expect(await lint(rule, file)).toEqual([]);
      });
    }
  }
});

// The version-2 autofixes are agentx's migration codemod (TASK-045): one oxlint --fix run applies
// them, a second run changes nothing, and no fixable report is left.
const FIX_DIR = join(ROOT, "tests", "cli", "fixtures", "fix-safety", "solidjs-v2");
const FIX_FIXTURES = readdirSync(FIX_DIR)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => ({ rule: f.replace(/\.tsx$/, ""), file: join(FIX_DIR, f) }));

/** Messages of reports that carry a fix, per rule; none may remain after --fix. */
const FIXABLE_MESSAGES: Record<string, RegExp> = {
  "no-removed-apis": /^`\w+` is `\w+` in Solid 2\.0\.$|^In Solid 2\.0 a context is its own provider: use/,
  "effect-split": /returns a value that isn't a cleanup function/,
};

describe("version-2 autofixes are idempotent", () => {
  for (const { rule, file } of FIX_FIXTURES) {
    test(`${rule}: one --fix run is a fixed point`, async () => {
      await buildPlugin("solidjs");
      const configPath = await writeOxlintConfig({
        plugins: ["solidjs"],
        rules: { [`solidjs/${rule}`]: "error" },
        settings: { solidjs: { version: 2 } },
      });
      configs.push(configPath);
      const name = `${rule}.tsx`;
      const first = (await runOxlintWithFix({ configPath, files: [file] })).fixedFiles[name] ?? "";
      expect(first).not.toBe(await Bun.file(file).text());

      const dir = await mkdtemp(join(tmpdir(), "solidjs-v2-fix-"));
      try {
        const once = join(dir, name);
        await Bun.write(once, first);
        const second = await runOxlintWithFix({ configPath, files: [once] });
        expect(second.fixedFiles[name]).toBe(first);
        const pattern = FIXABLE_MESSAGES[rule];
        expect(pattern).toBeDefined();
        expect(second.diagnostics.filter((d) => pattern!.test(d.message)).map((d) => d.message)).toEqual([]);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
  }
});
