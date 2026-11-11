import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { packageDir } from "../../scripts/plugins.ts";
import {
  buildPlugin,
  cleanupConfig,
  reportedLines,
  ruleCode,
  runOxlint,
  writeOxlintConfig,
} from "./helpers/cli-runner";

// @takinprofit/errorset 0.4/0.5 patterns. The fixtures are real TypeScript modules that
// `bun run check` type-checks against @takinprofit/errorset 0.5.0 (packages/errorset/tests/patterns).
// A `// report: rule-a, rule-b` comment marks the lines each rule must report.
const PLUGIN = "errorset" as const;
const RULES = [
  "no-throw-errorset",
  "no-catch-errorset",
  "no-new-error-in-errorset-fn",
  "prefer-guard-over-manual-kind-check",
  "no-unguarded-data-access",
] as const;
const DIR = join(packageDir(PLUGIN), "tests", "patterns");
const FIXTURES = readdirSync(DIR)
  .filter((f) => f.endsWith(".ts"))
  .sort();

async function expectedLines(file: string, rule: string): Promise<number[]> {
  const lines = (await Bun.file(file).text()).split("\n");
  return lines.flatMap((line, i) => {
    const m = /\/\/ report: (.+)$/.exec(line);
    return m?.[1]
      ?.split(",")
      .map((r) => r.trim())
      .includes(rule)
      ? [i + 1]
      : [];
  });
}

let configPath: string;

beforeAll(async () => {
  await buildPlugin(PLUGIN);
  configPath = await writeOxlintConfig({
    plugins: [PLUGIN],
    rules: Object.fromEntries(RULES.map((r) => [`errorset/${r}`, "error"])),
  });
});

afterAll(async () => {
  await cleanupConfig(configPath);
});

test("pattern fixtures exist", () => {
  expect(FIXTURES).toEqual(["capture.ts", "is-err.ts", "merged.ts", "object-form.ts", "to-error.ts", "with-cause.ts"]);
});

for (const fixture of FIXTURES) {
  describe(`errorset 0.5 pattern: ${fixture}`, () => {
    for (const rule of RULES) {
      test(rule, async () => {
        const file = join(DIR, fixture);
        const result = await runOxlint({ configPath, files: [file] });
        expect(result.stderr).not.toContain("Error running JS plugin");
        const diags = result.diagnostics.filter((d) => d.code === ruleCode(PLUGIN, rule));
        expect(reportedLines(diags)).toEqual(await expectedLines(file, rule));
      });
    }
  });
}
