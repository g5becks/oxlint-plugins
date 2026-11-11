/**
 * The single source of plugin names for this repo.
 *
 * Every build script, test and preset derives directory names, npm package
 * names and rule prefixes from this map. Do not hard-code them elsewhere.
 *
 * - `name`        normalized plugin name: the rule prefix and diagnostic code
 *                 prefix used by oxlint >= 1.70 (`immutable/no-let`,
 *                 `immutable(no-let)`); also the package directory name.
 * - `packageName` the npm package name, which is also the plugin's `meta.name`.
 * - `legacyDir`   the directory name before the 0.2.0 rename (history only).
 */
import { join, resolve } from "node:path";

export interface PluginInfo {
  readonly name: PluginName;
  readonly packageName: `oxlint-plugin-${string}`;
  readonly legacyDir: string;
}

export const PLUGIN_NAMES = ["errorset", "immutable", "ts-no-assert", "query", "router", "solidjs"] as const;
export type PluginName = (typeof PLUGIN_NAMES)[number];

export const PLUGINS: Readonly<Record<PluginName, PluginInfo>> = {
  errorset: { name: "errorset", packageName: "oxlint-plugin-errorset", legacyDir: "plugin-errorset" },
  immutable: { name: "immutable", packageName: "oxlint-plugin-immutable", legacyDir: "plugin-functional" },
  "ts-no-assert": {
    name: "ts-no-assert",
    packageName: "oxlint-plugin-ts-no-assert",
    legacyDir: "plugin-no-type-assertion",
  },
  query: { name: "query", packageName: "oxlint-plugin-query", legacyDir: "plugin-query" },
  router: { name: "router", packageName: "oxlint-plugin-router", legacyDir: "plugin-router" },
  solidjs: { name: "solidjs", packageName: "oxlint-plugin-solidjs", legacyDir: "plugin-solid" },
};

/** Repository root (this file lives in scripts/). */
export const REPO_ROOT = resolve(import.meta.dirname, "..");

/** Absolute path of a plugin's package directory. */
export function packageDir(name: PluginName): string {
  return join(REPO_ROOT, "packages", name);
}

/** Absolute path of a plugin's source entry point. */
export function entryPoint(name: PluginName): string {
  return join(packageDir(name), "src", "index.ts");
}

/** Absolute path of a plugin's built bundle. */
export function distEntry(name: PluginName): string {
  return join(packageDir(name), "dist", "index.js");
}

/** Config key / suppression name for a rule on oxlint >= 1.70: `<name>/<rule>`. */
export function ruleKey(name: PluginName, rule: string): string {
  return `${name}/${rule}`;
}
