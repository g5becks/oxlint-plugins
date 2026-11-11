import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import errorset from "../../packages/errorset/src/index.ts";
import immutable from "../../packages/immutable/src/index.ts";
import query from "../../packages/query/src/index.ts";
import router from "../../packages/router/src/index.ts";
import solidjs from "../../packages/solidjs/src/index.ts";
import tsNoAssert from "../../packages/ts-no-assert/src/index.ts";
import { PLUGIN_NAMES, type PluginName } from "../../scripts/plugins.ts";
import { ROOT, buildAllPlugins, cleanupConfig, runOxlint, writeOxlintConfig } from "./helpers/cli-runner";

// The agentx-client corpus (tests/fixtures/corpus, 76 real-world Solid/TanStack files, formerly
// client/) linted with every rule of every plugin: no rule may crash ("Error running JS plugin").
// Also used by scripts/determinism.ts and the parity/performance work.
const rules = Object.entries({ errorset, immutable, "ts-no-assert": tsNoAssert, query, router, solidjs }).flatMap(
  ([name, plugin]) => Object.keys((plugin as unknown as { rules: object }).rules).map((r) => `${name}/${r}`),
);

describe("agentx-client corpus", () => {
  test("every rule of every plugin runs over the corpus without crashing", async () => {
    await buildAllPlugins();
    const configPath = await writeOxlintConfig({
      plugins: [...PLUGIN_NAMES] as PluginName[],
      rules: Object.fromEntries(rules.map((r) => [r, "warn"])),
    });
    try {
      const result = await runOxlint({ configPath, files: [join(ROOT, "tests", "fixtures", "corpus")] });
      expect(result.stderr).not.toContain("Error running JS plugin");
      expect(result.numberOfFiles).toBe(76);
      expect(result.numberOfRules).toBeGreaterThanOrEqual(rules.length);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      for (const d of result.diagnostics) {
        expect(d.message.startsWith("Error running JS plugin")).toBe(false);
      }
    } finally {
      await cleanupConfig(configPath);
    }
  });
});
