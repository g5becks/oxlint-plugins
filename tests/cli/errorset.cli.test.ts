import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  buildPlugin,
  writeOxlintConfig,
  runOxlint,
  runOxlintWithFix,
  cleanupConfig,
  ruleFixture,
  ruleCode,
  markedLines,
  reportedLines,
} from "./helpers/cli-runner";

const PLUGIN = "errorset" as const;
const RULES = [
  "no-throw-errorset",
  "no-catch-errorset",
  "no-new-error-in-errorset-fn",
  "prefer-guard-over-manual-kind-check",
  "no-unguarded-data-access",
] as const;

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

for (const RULE of RULES) {
  describe(RULE, () => {
    test("reports every marked line", async () => {
      const file = ruleFixture(PLUGIN, RULE);
      const result = await runOxlint({ configPath, files: [file] });
      const diags = result.diagnostics.filter((d) => d.code === ruleCode(PLUGIN, RULE));
      const expected = await markedLines(file);
      expect(expected.length).toBeGreaterThan(0);
      expect(reportedLines(diags)).toEqual(expected);
    });

    test("all diagnostics are errors", async () => {
      const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
      const diags = result.diagnostics.filter((d) => d.code === ruleCode(PLUGIN, RULE));
      expect(diags.length).toBeGreaterThan(0);
      for (const d of diags) expect(d.severity).toBe("error");
    });
  });
}

describe("known bugs (audit probes)", () => {
  // Audit R1: rules are inert unless the file imports @takinprofit/errorset itself.
  test.failing("TASK-012: reports error sets imported from a re-exporting module", async () => {
    const file = ruleFixture(PLUGIN, "reexported-set");
    const result = await runOxlint({ configPath, files: [file] });
    const diags = result.diagnostics.filter((d) => d.code === ruleCode(PLUGIN, "no-throw-errorset"));
    expect(reportedLines(diags)).toEqual(await markedLines(file));
  });

  // Audit R3: no-throw-errorset used to autofix `throw` -> `return`, which changes runtime
  // behavior inside callbacks and try/finally. It now only offers a suggestion, so
  // `oxlint --fix` must leave every throw untouched (callbacks, try/finally and direct throws).
  for (const name of ["unsafe-fix", "no-throw-errorset"]) {
    test(`--fix never rewrites throw statements: ${name}.ts (audit R3)`, async () => {
      const file = ruleFixture(PLUGIN, name);
      const original = await Bun.file(file).text();
      const result = await runOxlintWithFix({ configPath, files: [file] });
      expect(result.diagnostics.some((d) => d.code === ruleCode(PLUGIN, "no-throw-errorset"))).toBe(true);
      expect(result.fixedFiles[`${name}.ts`]).toBe(original);
    });
  }
});
