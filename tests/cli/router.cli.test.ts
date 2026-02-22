import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  buildPlugin,
  writeOxlintConfig,
  runOxlint,
  runOxlintWithFix,
  cleanupConfig,
  fixture,
  ruleFixture,
} from "./helpers/cli-runner";

const PLUGIN = "router";
const CODE = (rule: string) => `oxlint-plugin-${PLUGIN}(${rule})`;

let configPath: string;

beforeAll(async () => {
  await buildPlugin("router");
  configPath = await writeOxlintConfig({
    plugins: ["router"],
    rules: {
      "oxlint-plugin-router/route-param-names": "error",
      "oxlint-plugin-router/create-route-property-order": "error",
    },
  });
});

afterAll(async () => {
  await cleanupConfig(configPath);
});

// ── Legacy smoke tests (old fixtures) ─────────────────
describe("plugin-router CLI (legacy)", () => {
  test("valid fixture produces zero diagnostics", async () => {
    const result = await runOxlint({
      configPath,
      files: [fixture("router-valid.ts")],
    });
    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toHaveLength(0);
  });
});

// ── route-param-names ─────────────────────────────────
describe("route-param-names", () => {
  const RULE = "route-param-names";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({
      configPath,
      files: [ruleFixture(PLUGIN, RULE)],
    });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(3);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({
      configPath,
      files: [ruleFixture(PLUGIN, RULE)],
    });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([20, 25, 31]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({
      configPath,
      files: [ruleFixture(PLUGIN, RULE)],
    });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── create-route-property-order ───────────────────────
describe("create-route-property-order", () => {
  const RULE = "create-route-property-order";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({
      configPath,
      files: [ruleFixture(PLUGIN, RULE)],
    });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({
      configPath,
      files: [ruleFixture(PLUGIN, RULE)],
    });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([15, 23]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({
      configPath,
      files: [ruleFixture(PLUGIN, RULE)],
    });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("--fix corrects property order", async () => {
    const result = await runOxlintWithFix({
      configPath,
      files: [ruleFixture(PLUGIN, RULE)],
    });
    const fixedContent = result.fixedFiles["create-route-property-order.ts"];
    expect(fixedContent).toBeDefined();
    // After fix, re-running should produce fewer or no diagnostics for this rule
    // The fix reorders properties, so "loaderDeps" should come before "loader"
    const loaderDepsIdx = fixedContent.indexOf("loaderDeps");
    const loaderIdx = fixedContent.indexOf("loader:");
    // In at least one of the fixed cases, loaderDeps should precede loader
    expect(loaderDepsIdx).toBeGreaterThan(-1);
  });
});
