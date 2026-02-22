import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { buildAllPlugins, writeOxlintConfig, runOxlint, cleanupConfig, fixture } from "./helpers/cli-runner";

let configPath: string;

beforeAll(async () => {
  await buildAllPlugins();
  configPath = await writeOxlintConfig({
    plugins: ["router", "query", "functional", "solid"],
    rules: {
      "oxlint-plugin-router/route-param-names": "error",
      "oxlint-plugin-query/stable-query-client": "error",
      "oxlint-plugin-functional/no-let": "error",
      "oxlint-plugin-solid/jsx-no-script-url": "error",
    },
  });
});

afterAll(async () => {
  await cleanupConfig(configPath);
});

describe("all plugins loaded together", () => {
  test("all 4 plugins load without conflict", async () => {
    const result = await runOxlint({
      configPath,
      files: [fixture("router-valid.ts")],
    });
    expect(result.exitCode).toBe(0);
    expect(result.numberOfRules).toBeGreaterThanOrEqual(4);
  });

  test("each plugin detects its own violations", async () => {
    const result = await runOxlint({
      configPath,
      files: [
        fixture("router-invalid.ts"),
        fixture("query-invalid.ts"),
        fixture("functional-invalid.ts"),
        fixture("solid-invalid.tsx"),
      ],
    });
    expect(result.exitCode).toBe(1);

    const pluginCodes = new Set(result.diagnostics.map((d) => d.code.split("(")[0]));
    expect(pluginCodes.has("oxlint-plugin-router")).toBe(true);
    expect(pluginCodes.has("oxlint-plugin-query")).toBe(true);
    expect(pluginCodes.has("oxlint-plugin-functional")).toBe(true);
    expect(pluginCodes.has("oxlint-plugin-solid")).toBe(true);
  });

  test("valid files across all plugins produce zero diagnostics", async () => {
    const result = await runOxlint({
      configPath,
      files: [
        fixture("router-valid.ts"),
        fixture("query-valid.ts"),
        fixture("functional-valid.ts"),
        fixture("solid-valid.tsx"),
      ],
    });
    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toHaveLength(0);
  });
});
