/**
 * oxlint's RuleTester (`oxlint/plugins-dev`) wired to `node:test`.
 *
 * Unit tests run under `node --test` (oxlint's RuleTester refuses to run on Bun) and load the
 * plugin `.ts` sources through Node's type stripping (Node >= 22.18).
 *
 * `OXLINT_RULE_TESTER=<path to oxlint/dist/plugins-dev.js>` swaps in the RuleTester of another
 * oxlint version (the version matrix uses it for the 1.70.0 floor).
 */
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import type * as PluginsDev from "oxlint/plugins-dev";

const override = process.env.OXLINT_RULE_TESTER;
const mod: typeof PluginsDev = override
  ? await import(pathToFileURL(override).href)
  : await import("oxlint/plugins-dev");

export const RuleTester = mod.RuleTester;
RuleTester.describe = describe;
RuleTester.it = it;

export type Lang = "js" | "jsx" | "ts" | "tsx";

/** A RuleTester parsing ES modules as `lang` (default TSX, which also accepts plain TS and JSX). */
export function ruleTester(lang: Lang = "tsx"): InstanceType<typeof RuleTester> {
  return new RuleTester({ languageOptions: { sourceType: "module", parserOptions: { lang } } });
}

interface PluginLike {
  rules: Record<string, unknown>;
}

/** Look up a rule on a plugin's default export, failing loudly on a typo. */
export function ruleOf(plugin: PluginLike, name: string): Parameters<InstanceType<typeof RuleTester>["run"]>[1] {
  const rule = plugin.rules[name];
  if (!rule) throw new Error(`no rule "${name}" in plugin`);
  return rule as Parameters<InstanceType<typeof RuleTester>["run"]>[1];
}
