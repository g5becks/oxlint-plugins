import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  buildAllPlugins,
  writeOxlintConfig,
  runOxlint,
  cleanupConfig,
  benchFixture,
  fixture,
} from "../cli/helpers/cli-runner";
import { parseTimings, profile } from "./profile.ts";

let configPath: string;

beforeAll(async () => {
  await buildAllPlugins();
  configPath = await writeOxlintConfig({
    plugins: ["router", "query", "immutable", "solidjs", "ts-no-assert", "errorset"],
    rules: {
      "router/route-param-names": "error",
      "router/create-route-property-order": "error",
      "query/stable-query-client": "error",
      "query/no-rest-destructuring": "error",
      "immutable/no-let": "error",
      "immutable/no-throw-statements": "error",
      "immutable/no-promise-reject": "error",
      "solidjs/jsx-no-script-url": "error",
      "solidjs/no-react-specific-props": "error",
      "solidjs/no-innerhtml": "error",
      "solidjs/no-destructure": "error",
      "solidjs/reactivity": "error",
      "ts-no-assert/no-type-assertion": "error",
      "errorset/no-throw-errorset": "error",
      "errorset/no-unguarded-data-access": "error",
    },
  });
});

afterAll(async () => {
  await cleanupConfig(configPath);
});

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const at = (i: number): number => sorted[i] ?? Number.NaN;
  return sorted.length % 2 ? at(mid) : (at(mid - 1) + at(mid)) / 2;
}

function p95(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.min(index, sorted.length - 1)] ?? Number.NaN;
}

describe("benchmarks", () => {
  test("cold start: single large file with all plugins", async () => {
    const result = await runOxlint({
      configPath,
      files: [benchFixture("large-mixed.ts")],
    });
    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toHaveLength(0);
    console.log(`  Cold start: ${result.durationMs.toFixed(0)}ms (${result.numberOfRules} rules)`);
  });

  test("warm runs: 10 iterations, report median/p95", async () => {
    const durations: number[] = [];

    for (let i = 0; i < 10; i++) {
      const result = await runOxlint({
        configPath,
        files: [benchFixture("large-mixed.ts")],
      });
      expect(result.exitCode).toBe(0);
      expect(result.diagnostics).toHaveLength(0);
      durations.push(result.durationMs);
    }

    const med = median(durations);
    const p = p95(durations);
    console.log(`  Warm runs (10 iter): median=${med.toFixed(0)}ms, p95=${p.toFixed(0)}ms`);
  });

  test("multi-file: lint all fixtures at once", async () => {
    const result = await runOxlint({
      configPath,
      files: [
        benchFixture("large-mixed.ts"),
        benchFixture("large-solid.tsx"),
        fixture("router-valid.ts"),
        fixture("query-valid.ts"),
        fixture("immutable-valid.ts"),
        fixture("solidjs-valid.tsx"),
      ],
    });
    expect(result.exitCode).toBe(0);
    expect(result.numberOfFiles).toBe(6);
    expect(result.diagnostics).toHaveLength(0);
    console.log(
      `  Multi-file: ${result.durationMs.toFixed(0)}ms, ${result.numberOfFiles} files, ${result.diagnostics.length} diagnostics`,
    );
  });

  test("large solid fixture with all solid rules", async () => {
    const solidConfig = await writeOxlintConfig({
      plugins: ["solidjs"],
      rules: {
        "solidjs/jsx-no-duplicate-props": "error",
        "solidjs/jsx-no-script-url": "error",
        "solidjs/no-react-specific-props": "error",
        "solidjs/no-innerhtml": "error",
        "solidjs/no-destructure": "error",
        "solidjs/self-closing-comp": "warn",
        "solidjs/prefer-for": "warn",
        "solidjs/reactivity": "warn",
      },
    });

    const result = await runOxlint({
      configPath: solidConfig,
      files: [benchFixture("large-solid.tsx")],
    });
    expect(result.exitCode).toBe(0);
    expect(result.numberOfFiles).toBe(1);
    expect(result.diagnostics).toHaveLength(0);
    console.log(
      `  Solid (8 rules incl. reactivity, ~200 lines): ${result.durationMs.toFixed(0)}ms, ${result.diagnostics.length} diagnostics`,
    );
    await cleanupConfig(solidConfig);
  });
});

// TASK-028: the profiler (`bun run bench:profile`) keeps working on every oxlint in the matrix.
describe("profiler", () => {
  test("quick profile: per-plugin and per-rule medians on the corpus", async () => {
    const p = await profile({ runs: 1, warmup: 0, plugins: ["ts-no-assert"], perRule: true });
    expect(p.method.files).toBeGreaterThan(50);
    expect(p.baselineMs).toBeGreaterThan(0);
    const plugin = p.plugins["ts-no-assert"];
    expect(plugin?.medianMs).toBeGreaterThan(0);
    expect(Object.keys(plugin?.rules ?? {})).toEqual(["ts-no-assert/no-type-assertion"]);
    // Rule timings exist only where oxlint prints them (1.93.0 yes, 1.70.0 no).
    expect(plugin?.callbacksMs === null).toBe(!p.method.timingsAvailable);
  }, 60_000);

  test("parses the --debug=timings table", () => {
    const out = [
      "Finished in 85ms on 76 files with 1 rules using 1 threads.",
      "Rule timings:",
      "Rule                 Time (ms)  Relative  Calls  Source",
      "------------------  ----------  --------  -----  ---------",
      "solidjs/reactivity      14.779    100.0%   5203  js-plugin",
      "JS plugin runtime:",
      "  Total:               42.225ms",
    ].join("\n");
    expect(parseTimings(out)).toEqual({ rules: { "solidjs/reactivity": 14.779 }, jsRuntimeTotalMs: 42.225 });
    expect(parseTimings("Finished in 85ms")).toBeNull();
  });
});
