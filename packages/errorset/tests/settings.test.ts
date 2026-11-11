import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";
import { DEFAULT_GUARD_PATTERN, parseErrorsetSettings } from "../src/utils/settings.ts";

// settings.errorset (audit R1): error sets re-exported from other modules.
const rule = ruleOf(plugin, "no-throw-errorset");
const tester = ruleTester("ts");
const core = { errorset: { modules: ["@agentx/core"] } };
const THROW = "export function f(id: string) { throw UserError.not_found`missing`({ id }); }";
const THROW_ALIAS = "export function f(id: string) { throw UE.not_found`missing`({ id }); }";

tester.run("no-throw-errorset with settings.errorset", rule, {
  valid: [
    // No settings: imports from other modules are not error sets (unchanged default).
    { code: `import { UserError } from "@agentx/core";\n${THROW}` },
    // Module not configured.
    { code: `import { UserError } from "@other/lib";\n${THROW}`, settings: core },
    // Type-only imports are not runtime guards (declaration- and specifier-level).
    { code: `import type { UserError } from "@agentx/core";\n${THROW}`, settings: core },
    { code: `import { type UserError } from "@agentx/core";\n${THROW}`, settings: core },
    // Imported name doesn't match the default guardPattern.
    {
      code: `import { users } from "@agentx/core";\nexport function f() { throw users.not_found\`x\`; }`,
      settings: core,
    },
    // Namespace imports are not tracked (documented limitation).
    {
      code: 'import * as c from "@agentx/core";\nexport function f() { throw c.UserError.not_found`x`; }',
      settings: core,
    },
    // Invalid settings are ignored (defaults apply), never a crash.
    {
      code: `import { UserError } from "@agentx/core";\n${THROW}`,
      settings: { errorset: { modules: "@agentx/core" } },
    },
    { code: `import { UserError } from "@agentx/core";\n${THROW}`, settings: { errorset: { modules: [42] } } },
    { code: `import { UserError } from "@agentx/core";\n${THROW}`, settings: { errorset: "nope" } },
  ],
  invalid: [
    // Configured module, guard-named import.
    { code: `import { UserError } from "@agentx/core";\n${THROW}`, settings: core, errors: [{ messageId: "noThrow" }] },
    // Aliased import: the imported name is matched, the local name is the guard.
    { code: `import { UserError as UE } from "@agentx/core";\n${THROW_ALIAS}`, settings: core, errors: 1 },
    // Custom guardPattern.
    {
      code: 'import { users } from "@agentx/core";\nexport function f() { throw users.not_found`x`; }',
      settings: { errorset: { modules: ["@agentx/core"], guardPattern: "^users$" } },
      errors: 1,
    },
    // Invalid guardPattern (doesn't compile) falls back to the default pattern.
    {
      code: `import { UserError } from "@agentx/core";\n${THROW}`,
      settings: { errorset: { modules: ["@agentx/core"], guardPattern: "(" } },
      errors: 1,
    },
    // Same-file detection is unchanged with settings present.
    {
      code: `import { errorSet } from "@takinprofit/errorset";\nconst UserError = errorSet("UserError", ["not_found"]).init();\n${THROW}`,
      settings: core,
      errors: 1,
    },
  ].map((c) => ({ ...c, output: null })),
});

describe("parseErrorsetSettings", () => {
  it("defaults", () => {
    const s = parseErrorsetSettings(undefined);
    assert.deepEqual([...s.modules], ["@takinprofit/errorset"]);
    assert.equal(s.guardPattern.source, new RegExp(DEFAULT_GUARD_PATTERN).source);
  });
  it("always includes @takinprofit/errorset and caches per settings object", () => {
    const settings = { errorset: { modules: ["@agentx/core"] } };
    const s = parseErrorsetSettings(settings);
    assert.deepEqual([...s.modules].sort(), ["@agentx/core", "@takinprofit/errorset"]);
    assert.equal(parseErrorsetSettings(settings), s);
  });
  it("ignores invalid values per key", () => {
    const s = parseErrorsetSettings({ errorset: { modules: ["ok", ""], guardPattern: 7 } });
    assert.deepEqual([...s.modules], ["@takinprofit/errorset"]);
    assert.equal(s.guardPattern.source, new RegExp(DEFAULT_GUARD_PATTERN).source);
  });
});
