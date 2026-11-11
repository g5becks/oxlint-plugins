import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  buildAllPlugins,
  writeOxlintConfig,
  runOxlint,
  cleanupConfig,
  benchFixture,
  fixture,
} from "../cli/helpers/cli-runner";

let configPath: string;

beforeAll(async () => {
  await buildAllPlugins();
  configPath = await writeOxlintConfig({
    plugins: ["router", "query", "immutable", "solidjs"],
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
    expect(result.numberOfFiles).toBeGreaterThanOrEqual(6);
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
      },
    });

    const result = await runOxlint({
      configPath: solidConfig,
      files: [benchFixture("large-solid.tsx")],
    });
    console.log(
      `  Solid (7 rules, ~200 lines): ${result.durationMs.toFixed(0)}ms, ${result.diagnostics.length} diagnostics`,
    );
    await cleanupConfig(solidConfig);
  });
});
