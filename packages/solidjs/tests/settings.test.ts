import assert from "node:assert/strict";
import { describe, it } from "node:test";
import plugin from "../src/index.ts";
import { parseSolidSettings, readSolidVersion } from "../src/utils/settings.ts";
import { MODULES_V2, PATHS_V2, REMOVED_V2, RENAMES_V2, TYPE_MODULES_V2 } from "../src/utils/solid2.ts";

// settings.solidjs.version (TASK-043): Solid 2.0 behavior is opt-in; 1.x stays the default.
describe("parseSolidSettings", () => {
  it("defaults to version 1 without settings", () => {
    assert.equal(parseSolidSettings(undefined).version, 1);
    assert.equal(parseSolidSettings(null).version, 1);
    assert.equal(parseSolidSettings({}).version, 1);
    assert.equal(parseSolidSettings({ solidjs: {} }).version, 1);
  });

  it("reads version 1 and 2", () => {
    assert.equal(parseSolidSettings({ solidjs: { version: 1 } }).version, 1);
    assert.equal(parseSolidSettings({ solidjs: { version: 2 } }).version, 2);
  });

  it("treats anything but the number 2 as version 1, without throwing", () => {
    for (const version of ["2", 3, 2.5, 0, -2, null, true, {}, [2], Number.NaN]) {
      assert.equal(parseSolidSettings({ solidjs: { version } }).version, 1, `version: ${String(version)}`);
    }
    for (const solidjs of ["2", 2, null, [], true]) {
      assert.equal(parseSolidSettings({ solidjs }).version, 1);
    }
  });

  it("caches per settings object", () => {
    const settings = { solidjs: { version: 2 } };
    assert.equal(parseSolidSettings(settings), parseSolidSettings(settings));
  });

  it("readSolidVersion never throws on a broken context", () => {
    assert.equal(readSolidVersion({ settings: { solidjs: { version: 2 } } }), 2);
    assert.equal(readSolidVersion({ settings: undefined } as never), 1);
    const throwing = {
      get settings(): never {
        throw new Error("boom");
      },
    };
    assert.equal(readSolidVersion(throwing), 1);
  });
});

describe("Solid 2.0 tables", () => {
  it("every entry cites its source section", () => {
    for (const [name, entry] of [...MODULES_V2, ...TYPE_MODULES_V2, ...PATHS_V2, ...RENAMES_V2, ...REMOVED_V2]) {
      assert.match(entry.cite, /^(MIGRATION|RFC 0\d|solid-js 2\.0\.3|@solidjs\/web 2\.0\.3) /, name);
    }
  });

  it("renames point at names that aren't themselves removed or renamed", () => {
    for (const [from, { to }] of RENAMES_V2) {
      assert.ok(!RENAMES_V2.has(to), `${from} -> ${to} is renamed again`);
      assert.ok(!REMOVED_V2.has(to), `${from} -> ${to} is removed`);
    }
  });
});

describe("presets", () => {
  const configs = (
    plugin as unknown as {
      configs: Record<string, { rules: Record<string, unknown>; settings?: unknown }>;
    }
  ).configs;

  it("recommended has no settings (1.x behavior)", () => {
    assert.equal(configs.recommended?.settings, undefined);
  });

  it("recommended-v2 opts into version 2", () => {
    const v2 = configs["recommended-v2"];
    assert.ok(v2, "configs['recommended-v2'] exists");
    assert.deepEqual(v2.settings, { solidjs: { version: 2 } });
    assert.equal(v2.rules["solidjs/prefer-classlist"], "off");
    assert.equal(v2.rules["solidjs/event-handlers"], "error");
    for (const rule of Object.keys(v2.rules)) {
      assert.ok(rule.slice("solidjs/".length) in plugin.rules, `${rule} is a plugin rule`);
    }
  });
});
