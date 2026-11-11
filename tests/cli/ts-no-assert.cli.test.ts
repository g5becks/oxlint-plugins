import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  buildPlugin,
  writeOxlintConfig,
  runOxlint,
  cleanupConfig,
  ruleFixture,
  ruleCode,
  markedLines,
  reportedLines,
} from "./helpers/cli-runner";

const PLUGIN = "ts-no-assert" as const;
const RULE = "no-type-assertion";
const CODE = ruleCode(PLUGIN, RULE);

let configPath: string;

beforeAll(async () => {
  await buildPlugin(PLUGIN);
  configPath = await writeOxlintConfig({
    plugins: [PLUGIN],
    rules: { "ts-no-assert/no-type-assertion": "error" },
  });
});

afterAll(async () => {
  await cleanupConfig(configPath);
});

describe("no-type-assertion", () => {
  test("reports every marked line and nothing else", async () => {
    const file = ruleFixture(PLUGIN, RULE);
    const result = await runOxlint({ configPath, files: [file] });
    const diags = result.diagnostics.filter((d) => d.code === CODE);
    expect(diags).toHaveLength(result.diagnostics.length);
    expect(reportedLines(diags)).toEqual(await markedLines(file));
  });

  test("all diagnostics are errors and the run exits non-zero", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    expect(result.diagnostics.length).toBeGreaterThan(0);
    for (const d of result.diagnostics) expect(d.severity).toBe("error");
    expect(result.exitCode).not.toBe(0);
  });
});

// Audit U1 probe. This is expected oxlint >= 1.70 behavior ("Normalize oxlint
// jsPlugin prefixes", #23335), not a plugin bug: the short-form directive
// suppresses, the long-form `oxlint-plugin-ts-no-assert/...` directive does not.
describe("suppression directives (oxlint >= 1.70)", () => {
  test("only the short-form directive suppresses", async () => {
    const file = ruleFixture(PLUGIN, "suppressions");
    const result = await runOxlint({ configPath, files: [file] });
    const diags = result.diagnostics.filter((d) => d.code === CODE);
    expect(reportedLines(diags)).toEqual(await markedLines(file));
  });
});
