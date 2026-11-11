import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import errorset from "../../packages/errorset/src/index.ts";
import immutable from "../../packages/immutable/src/index.ts";
import query from "../../packages/query/src/index.ts";
import router from "../../packages/router/src/index.ts";
import solidjs from "../../packages/solidjs/src/index.ts";
import tsNoAssert from "../../packages/ts-no-assert/src/index.ts";
import { PLUGIN_NAMES, type PluginName } from "../../scripts/plugins.ts";
import { ROOT, buildPlugin, cleanupConfig, runOxlint, writeOxlintConfig } from "./helpers/cli-runner";

// Audit R15: each plugin's `configs.recommended` must load into real oxlint as is.
type Severity = "error" | "warn" | "off";
type RuleEntry = Severity | [Severity, ...unknown[]];
const presets = Object.fromEntries(
  Object.entries({ errorset, immutable, "ts-no-assert": tsNoAssert, query, router, solidjs }).map(([n, p]) => [
    n,
    (p as unknown as { configs: { recommended: { rules: Record<string, RuleEntry> } } }).configs.recommended.rules,
  ]),
) as Record<PluginName, Record<string, RuleEntry>>;

const severityOf = (entry: RuleEntry): Severity => (Array.isArray(entry) ? entry[0] : entry);
const OXLINT_SEVERITY: Record<Exclude<Severity, "off">, string> = { error: "error", warn: "warning" };

describe("recommended presets in oxlint", () => {
  for (const name of PLUGIN_NAMES) {
    test(`${name}: preset loads without config errors and reports with its severities`, async () => {
      await buildPlugin(name);
      const preset = presets[name];
      const configPath = await writeOxlintConfig({ plugins: [name], rules: preset as never });
      try {
        const dir = join(ROOT, "tests", "cli", "fixtures", name);
        const files = readdirSync(dir)
          .filter((f) => /\.tsx?$/.test(f))
          .map((f) => join(dir, f));
        const result = await runOxlint({ configPath, files });
        expect(result.stderr).toBe("");
        expect(result.numberOfRules).toBeGreaterThan(0);

        const enabled = Object.entries(preset).filter(([, e]) => severityOf(e) !== "off");
        for (const d of result.diagnostics) {
          const rule = d.code.replace(/^.*\(|\)$/g, "");
          const entry = preset[`${name}/${rule}`];
          expect(entry).toBeDefined();
          const sev = severityOf(entry as RuleEntry);
          expect(sev).not.toBe("off");
          expect(d.severity).toBe(OXLINT_SEVERITY[sev as Exclude<Severity, "off">]);
        }
        // Every enabled rule that has a fixture of its own reports on it.
        for (const [key] of enabled) {
          const rule = key.slice(name.length + 1);
          const fixture = ["ts", "tsx"].map((ext) => join(dir, `${rule}.${ext}`)).find((f) => existsSync(f));
          if (!fixture) continue;
          const hits = result.diagnostics.filter(
            (d) => d.code === `${name}(${rule})` && d.filename !== "" && fixture.endsWith(d.filename),
          );
          expect({ rule, hits: hits.length > 0 }).toEqual({ rule, hits: true });
        }
      } finally {
        await cleanupConfig(configPath);
      }
    });
  }
});
