import { describe, expect, test } from "bun:test";
import errorset from "../../packages/errorset/src/index.ts";
import immutable from "../../packages/immutable/src/index.ts";
import query from "../../packages/query/src/index.ts";
import router from "../../packages/router/src/index.ts";
import solidjs from "../../packages/solidjs/src/index.ts";
import tsNoAssert from "../../packages/ts-no-assert/src/index.ts";
import { pluginMetaPath, pluginMetaSource } from "../../scripts/generate-plugin-meta.ts";
import { PLUGIN_NAMES, PLUGINS, type PluginName } from "../../scripts/plugins.ts";

interface PluginShape {
  meta: { name: string };
  rules: Record<string, unknown>;
  configs: { recommended: { rules: Record<string, unknown> } };
}
const plugins = { errorset, immutable, "ts-no-assert": tsNoAssert, query, router, solidjs } as unknown as Record<
  PluginName,
  PluginShape
>;

describe("plugin meta and presets come from the name map (audit R15)", () => {
  for (const name of PLUGIN_NAMES) {
    test(`${name}: generated plugin-meta.ts is up to date`, async () => {
      expect(await Bun.file(pluginMetaPath(name)).text()).toBe(pluginMetaSource(name));
    });

    test(`${name}: meta.name is the package name`, () => {
      expect(plugins[name].meta.name).toBe(PLUGINS[name].packageName);
    });

    test(`${name}: every recommended key is <normalized>/<existing rule>`, () => {
      const keys = Object.keys(plugins[name].configs.recommended.rules);
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        expect(key.startsWith(`${name}/`)).toBe(true);
        expect(Object.keys(plugins[name].rules)).toContain(key.slice(name.length + 1));
      }
    });
  }
});
