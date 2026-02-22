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
    plugins: ["router", "query", "functional", "solid"],
    rules: {
      "oxlint-plugin-router/route-param-names": "error",
      "oxlint-plugin-router/create-route-property-order": "error",
      "oxlint-plugin-query/stable-query-client": "error",
      "oxlint-plugin-query/no-rest-destructuring": "error",
      "oxlint-plugin-functional/no-let": "error",
      "oxlint-plugin-functional/no-throw-statements": "error",
      "oxlint-plugin-functional/no-promise-reject": "error",
      "oxlint-plugin-solid/jsx-no-script-url": "error",
      "oxlint-plugin-solid/no-react-specific-props": "error",
      "oxlint-plugin-solid/no-innerhtml": "error",
      "oxlint-plugin-solid/no-destructure": "error",
    },
  });
});

afterAll(async () => {
  await cleanupConfig(configPath);
});

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function p95(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.min(index, sorted.length - 1)];
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
        fixture("functional-valid.ts"),
        fixture("solid-valid.tsx"),
      ],
    });
    expect(result.numberOfFiles).toBeGreaterThanOrEqual(6);
    console.log(
      `  Multi-file: ${result.durationMs.toFixed(0)}ms, ${result.numberOfFiles} files, ${result.diagnostics.length} diagnostics`,
    );
  });

  test("large solid fixture with all solid rules", async () => {
    const solidConfig = await writeOxlintConfig({
      plugins: ["solid"],
      rules: {
        "oxlint-plugin-solid/jsx-no-duplicate-props": "error",
        "oxlint-plugin-solid/jsx-no-script-url": "error",
        "oxlint-plugin-solid/no-react-specific-props": "error",
        "oxlint-plugin-solid/no-innerhtml": "error",
        "oxlint-plugin-solid/no-destructure": "error",
        "oxlint-plugin-solid/self-closing-comp": "warn",
        "oxlint-plugin-solid/prefer-for": "warn",
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
