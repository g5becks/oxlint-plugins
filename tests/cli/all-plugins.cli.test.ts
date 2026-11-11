import { PLUGINS } from "../../scripts/plugins.ts";
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { buildAllPlugins, writeOxlintConfig, runOxlint, cleanupConfig, fixture } from "./helpers/cli-runner";

let configPath: string;

beforeAll(async () => {
  await buildAllPlugins();
  configPath = await writeOxlintConfig({
    plugins: ["router", "query", "immutable", "solidjs"],
    rules: {
      "router/route-param-names": "error",
      "query/stable-query-client": "error",
      "immutable/no-let": "error",
      "solidjs/jsx-no-script-url": "error",
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
        fixture("immutable-invalid.ts"),
        fixture("solidjs-invalid.tsx"),
      ],
    });
    expect(result.exitCode).toBe(1);

    const pluginCodes = new Set(result.diagnostics.map((d) => d.code.split("(")[0]));
    expect(pluginCodes.has(PLUGINS.router.packageName)).toBe(true);
    expect(pluginCodes.has(PLUGINS.query.packageName)).toBe(true);
    expect(pluginCodes.has(PLUGINS.immutable.packageName)).toBe(true);
    expect(pluginCodes.has(PLUGINS.solidjs.packageName)).toBe(true);
  });

  test("valid files across all plugins produce zero diagnostics", async () => {
    const result = await runOxlint({
      configPath,
      files: [
        fixture("router-valid.ts"),
        fixture("query-valid.ts"),
        fixture("immutable-valid.ts"),
        fixture("solidjs-valid.tsx"),
      ],
    });
    expect(result.exitCode).toBe(0);
    expect(result.diagnostics).toHaveLength(0);
  });
});
