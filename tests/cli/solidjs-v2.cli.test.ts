import { afterAll, describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ROOT,
  buildPlugin,
  cleanupConfig,
  markedLines,
  reportedLines,
  runOxlint,
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
export const V2_ONLY_RULES = new Set<string>([]);

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
