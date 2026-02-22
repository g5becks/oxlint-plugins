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

const PLUGIN = "query";
const CODE = (rule: string) => `oxlint-plugin-${PLUGIN}(${rule})`;

let configPath: string;

beforeAll(async () => {
  await buildPlugin("query");
  configPath = await writeOxlintConfig({
    plugins: ["query"],
    rules: {
      "oxlint-plugin-query/exhaustive-deps": "error",
      "oxlint-plugin-query/infinite-query-property-order": "error",
      "oxlint-plugin-query/mutation-property-order": "error",
      "oxlint-plugin-query/no-rest-destructuring": "error",
      "oxlint-plugin-query/no-unstable-deps": "error",
      "oxlint-plugin-query/stable-query-client": "error",
    },
  });
});

afterAll(async () => {
  await cleanupConfig(configPath);
});

// ── Legacy smoke tests ────────────────────────────────
describe("plugin-query CLI (legacy)", () => {
  test("valid fixture produces zero diagnostics", async () => {
    const result = await runOxlint({
      configPath,
      files: [fixture("query-valid.ts")],
    });
    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toHaveLength(0);
  });
});

// ── exhaustive-deps ───────────────────────────────────
describe("exhaustive-deps", () => {
  const RULE = "exhaustive-deps";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([19, 30]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("--fix adds missing deps to queryKey", async () => {
    const result = await runOxlintWithFix({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const fixed = result.fixedFiles["exhaustive-deps.ts"];
    expect(fixed).toBeDefined();
    expect(fixed).toContain("userId");
  });
});

// ── infinite-query-property-order ─────────────────────
describe("infinite-query-property-order", () => {
  const RULE = "infinite-query-property-order";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([17, 27]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("--fix reorders properties", async () => {
    const result = await runOxlintWithFix({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const fixed = result.fixedFiles["infinite-query-property-order.ts"];
    expect(fixed).toBeDefined();
    // After fix, queryFn should appear before getNextPageParam
    const qfIdx = fixed!.indexOf("queryFn");
    const gnpIdx = fixed!.indexOf("getNextPageParam");
    expect(qfIdx).toBeLessThan(gnpIdx);
  });
});

// ── mutation-property-order ───────────────────────────
describe("mutation-property-order", () => {
  const RULE = "mutation-property-order";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([17, 26]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("--fix reorders mutation properties", async () => {
    const result = await runOxlintWithFix({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const fixed = result.fixedFiles["mutation-property-order.ts"];
    expect(fixed).toBeDefined();
    // After fix, onMutate should appear before onError
    const omIdx = fixed!.indexOf("onMutate");
    const oeIdx = fixed!.indexOf("onError");
    expect(omIdx).toBeLessThan(oeIdx);
  });
});

// ── no-rest-destructuring ─────────────────────────────
describe("no-rest-destructuring", () => {
  const RULE = "no-rest-destructuring";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([16, 37]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── no-unstable-deps ──────────────────────────────────
describe("no-unstable-deps", () => {
  const RULE = "no-unstable-deps";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([29, 42]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });
});

// ── stable-query-client ───────────────────────────────
describe("stable-query-client", () => {
  const RULE = "stable-query-client";

  test("reports exact diagnostic count", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    expect(diags).toHaveLength(2);
  });

  test("reports correct lines", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    const lines = diags.map((d) => d.labels[0]?.span.line).sort((a, b) => a - b);
    expect(lines).toEqual([10, 16]);
  });

  test("all diagnostics are errors", async () => {
    const result = await runOxlint({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const diags = result.diagnostics.filter((d) => d.code === CODE(RULE));
    for (const d of diags) expect(d.severity).toBe("error");
  });

  test("--fix wraps QueryClient in useState", async () => {
    const result = await runOxlintWithFix({ configPath, files: [ruleFixture(PLUGIN, RULE)] });
    const fixed = result.fixedFiles["stable-query-client.ts"];
    expect(fixed).toBeDefined();
  });
});
