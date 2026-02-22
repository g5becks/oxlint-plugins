import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  buildPlugin,
  writeOxlintConfig,
  runOxlint,
  runOxlintWithFix,
  cleanupConfig,
  ruleFixture,
} from "./helpers/cli-runner";

const PLUGIN = "functional";
const CODE = (rule: string) => `oxlint-plugin-${PLUGIN}(${rule})`;

let configPath: string;
let configPathWithOptions: string;

beforeAll(async () => {
  await buildPlugin("functional");
  configPath = await writeOxlintConfig({
    plugins: ["functional"],
    rules: {
      "oxlint-plugin-functional/no-let": "error",
      "oxlint-plugin-functional/no-throw-statements": "error",
      "oxlint-plugin-functional/no-promise-reject": "error",
      "oxlint-plugin-functional/readonly-type": "error",
      "oxlint-plugin-functional/prefer-property-signatures": "error",
      "oxlint-plugin-functional/prefer-immutable-types": "error",
      "oxlint-plugin-functional/type-declaration-immutability": "error",
      "oxlint-plugin-functional/immutable-data": "error",
    },
  });
  configPathWithOptions = await writeOxlintConfig({
    plugins: ["functional"],
    rules: {
      "oxlint-plugin-functional/no-let": ["error", { allowInForLoopInit: true }],
      "oxlint-plugin-functional/no-throw-statements": ["error", { allowInAsyncFunctions: true }],
    },
  });
});

afterAll(async () => {
  await cleanupConfig(configPath);
  await cleanupConfig(configPathWithOptions);
});

// Legacy fixture tested via all-plugins.cli.test.ts

// ── no-let ────────────────────────────────────────────
describe("no-let", () => {
  const RULE = "no-let";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(3);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([8, 11, 14]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("allowInForLoopInit option reduces count", async () => {
    const result = await runOxlint({ configPath: configPathWithOptions, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });
});

// ── no-throw-statements ──────────────────────────────
describe("no-throw-statements", () => {
  const RULE = "no-throw-statements";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(3);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([12, 18, 23]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("allowInAsyncFunctions option reduces count", async () => {
    const result = await runOxlint({ configPath: configPathWithOptions, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });
});

// ── no-promise-reject ─────────────────────────────────
describe("no-promise-reject", () => {
  const RULE = "no-promise-reject";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([7, 10]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── readonly-type ─────────────────────────────────────
describe("readonly-type", () => {
  const RULE = "readonly-type";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(4);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([11, 17, 18, 24]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("--fix adds readonly modifiers", async () => {
    const result = await runOxlintWithFix({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const fixed = result.fixedFiles["readonly-type.ts"];
    expect(fixed).toBeDefined();
    // Should add readonly to previously mutable properties
    expect(fixed).toContain("readonly name");
  });
});

// ── prefer-property-signatures ────────────────────────
describe("prefer-property-signatures", () => {
  const RULE = "prefer-property-signatures";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(4);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([11, 12, 17, 18]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("--fix converts method to property signature", async () => {
    const result = await runOxlintWithFix({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const fixed = result.fixedFiles["prefer-property-signatures.ts"];
    expect(fixed).toBeDefined();
  });
});

// ── prefer-immutable-types ────────────────────────────
describe("prefer-immutable-types", () => {
  const RULE = "prefer-immutable-types";

  test("reports diagnostics for mutable parameters", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags.length).toBeGreaterThanOrEqual(3);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── type-declaration-immutability ─────────────────────
describe("type-declaration-immutability", () => {
  const RULE = "type-declaration-immutability";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(3);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([15, 21, 27]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── immutable-data ────────────────────────────────────
describe("immutable-data", () => {
  const RULE = "immutable-data";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(4);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([11, 15, 19, 23]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });
});
