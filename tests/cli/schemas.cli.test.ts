import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import errorset from "../../packages/errorset/src/index.ts";
import immutable from "../../packages/immutable/src/index.ts";
import query from "../../packages/query/src/index.ts";
import router from "../../packages/router/src/index.ts";
import solidjs from "../../packages/solidjs/src/index.ts";
import tsNoAssert from "../../packages/ts-no-assert/src/index.ts";
import { oxlintBin } from "../helpers/oxlint-bin.ts";
import { PLUGIN_NAMES, type PluginName } from "../../scripts/plugins.ts";
import { buildAllPlugins, bundlePath } from "./helpers/cli-runner";

// Audit R16: oxlint validates rule options against meta.schema and aborts the whole run with
// "Options validation failed for rule ..." when they don't match, so schemas are public API.
// Every rule with options: valid option sets load, invalid ones are rejected (unknown key and
// wrong type at least), in real oxlint (the CLI suite also runs on the 1.70.0 floor).
type Options = Record<string, unknown>;
const CASES: Record<string, { valid: Options[]; invalid: Options[] }> = {
  "errorset/no-new-error-in-errorset-fn": {
    valid: [{}, { allowedBuiltins: ["TypeError", "RangeError"] }],
    invalid: [{ allowedBuiltins: "TypeError" }, { allowed: ["TypeError"] }],
  },
  "errorset/no-unguarded-data-access": {
    valid: [{}, { properties: ["data"] }],
    invalid: [{ properties: "data" }, { props: ["data"] }],
  },
  "immutable/no-let": {
    valid: [{}, { allowInForLoopInit: true }],
    invalid: [{ allowInForLoopInit: "yes" }, { allowInFunctions: true }],
  },
  "immutable/no-throw-statements": {
    valid: [{}, { allowInAsyncFunctions: true }],
    invalid: [{ allowInAsyncFunctions: 1 }, { allowToRejectPromises: true }],
  },
  "immutable/prefer-property-signatures": {
    valid: [{}, { ignoreIfReadonlyWrapped: true }],
    invalid: [{ ignoreIfReadonlyWrapped: "true" }, { ignore: true }],
  },
  "immutable/prefer-immutable-types": {
    valid: [
      {},
      { parameters: { enforcement: "ReadonlyShallow" } },
      {
        parameters: { enforcement: "None" },
        returnTypes: { enforcement: false },
        variables: { ignoreNamePattern: "^mutable" },
      },
      { returnTypes: { ignoreNamePattern: ["^a", "^b"] } },
    ],
    invalid: [
      { parameters: { enforcement: "Immutable" } },
      { parameters: { ignoreInferredTypes: true } },
      { parameters: "ReadonlyShallow" },
      { enforcement: "ReadonlyShallow" },
    ],
  },
  "immutable/type-declaration-immutability": {
    valid: [{}, { identifiers: "^I", ignoreInterfaces: true }, { identifiers: ["^A", "^B"] }],
    invalid: [{ identifiers: 1 }, { ignoreInterfaces: "no" }, { rules: [] }],
  },
  "immutable/immutable-data": {
    valid: [{}, { ignoreClasses: true, ignoreMapsAndSets: true, ignoreIdentifierPattern: ["^mutable"] }],
    invalid: [{ ignoreClasses: "yes" }, { ignoreAccessorPattern: "x" }],
  },
  "solidjs/event-handlers": {
    valid: [{}, { ignoreCase: true, warnOnSpread: true }],
    invalid: [{ ignoreCase: "true" }, { strict: true }],
  },
  "solidjs/jsx-no-duplicate-props": {
    valid: [{}, { ignoreCase: true }],
    invalid: [{ ignoreCase: 0 }, { caseSensitive: true }],
  },
  "solidjs/jsx-no-undef": {
    valid: [{}, { allowGlobals: true, autoImport: false, typescriptEnabled: true }],
    invalid: [{ autoImport: "no" }, { imports: true }],
  },
  "solidjs/no-innerhtml": {
    valid: [{}, { allowStatic: false }],
    invalid: [{ allowStatic: "false" }, { allow: true }],
  },
  "solidjs/no-unknown-namespaces": {
    valid: [{}, { allowedNamespaces: ["custom"] }],
    invalid: [{ allowedNamespaces: [] }, { allowedNamespaces: ["a", "a"] }, { namespaces: ["x"] }],
  },
  "solidjs/prefer-classlist": {
    valid: [{}, { classnames: ["cn"] }],
    invalid: [{ classnames: [] }, { classnames: "cn" }, { functions: ["cn"] }],
  },
  "solidjs/reactivity": {
    valid: [{}, { customReactiveFunctions: ["track"] }],
    invalid: [{ customReactiveFunctions: "track" }, { reactiveFunctions: ["track"] }],
  },
  "solidjs/self-closing-comp": {
    valid: [{}, { component: "none", html: "void" }],
    invalid: [{ component: "some" }, { html: "always" }, { svg: "all" }],
  },
  "solidjs/style-prop": {
    valid: [{}, { styleProps: ["style", "css"], allowString: true }],
    invalid: [{ styleProps: [] }, { allowString: "yes" }, { props: ["style"] }],
  },
};

const plugins = { errorset, immutable, "ts-no-assert": tsNoAssert, query, router, solidjs } as unknown as Record<
  PluginName,
  { rules: Record<string, { meta?: { schema?: unknown } }> }
>;
const RULES_WITH_OPTIONS = (Object.keys(plugins) as PluginName[]).flatMap((p) =>
  Object.entries(plugins[p].rules)
    .filter(([, r]) => (Array.isArray(r.meta?.schema) ? r.meta.schema.length > 0 : Boolean(r.meta?.schema)))
    .map(([r]) => `${p}/${r}`),
);

let dir: string;
beforeAll(async () => {
  await buildAllPlugins();
  dir = await mkdtemp(join(tmpdir(), "oxlint-schemas-"));
  await Bun.write(join(dir, "a.tsx"), "export const a = 1;\n");
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function lintWith(rule: string, options: Options) {
  const config = join(dir, ".oxlintrc.json");
  await Bun.write(
    config,
    JSON.stringify({ jsPlugins: PLUGIN_NAMES.map((n) => bundlePath(n)), rules: { [rule]: ["error", options] } }),
  );
  const proc = Bun.spawn([oxlintBin(), "-c", config, "-A", "all", "--format", "json", join(dir, "a.tsx")], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = (await new Response(proc.stdout).text()) + (await new Response(proc.stderr).text());
  return { exitCode: await proc.exited, out };
}

describe("rule option schemas in real oxlint (audit R16)", () => {
  test("every rule with options has schema cases", () => {
    expect(RULES_WITH_OPTIONS.sort()).toEqual(Object.keys(CASES).sort());
  });

  for (const [rule, { valid, invalid }] of Object.entries(CASES)) {
    for (const options of valid) {
      test(`${rule}: accepts ${JSON.stringify(options)}`, async () => {
        const { exitCode, out } = await lintWith(rule, options);
        expect(out).not.toContain("Options validation failed");
        expect(out).not.toContain("Failed to setup JS plugin options");
        // The run completes with JSON output; exit 1 only means the rule reported on the probe file.
        expect(Array.isArray(JSON.parse(out).diagnostics)).toBe(true);
        expect(exitCode).toBeLessThanOrEqual(1);
      });
    }
    for (const options of invalid) {
      test(`${rule}: rejects ${JSON.stringify(options)}`, async () => {
        const { exitCode, out } = await lintWith(rule, options);
        expect(out).toContain("Options validation failed");
        expect(exitCode).not.toBe(0);
      });
    }
  }
});
