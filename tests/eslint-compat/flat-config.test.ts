/**
 * ESLint compatibility: every plugin loads in an ESLint 9 flat config with the
 * typescript-eslint parser, with one valid and one invalid case per plugin.
 * Rule behavior is unit-tested in oxlint's RuleTester (packages/*\/tests, node --test);
 * this suite only proves the ESLint path (the eslintCompatPlugin wrapper) works.
 */
import { describe, expect, test } from "bun:test";
import tsParser from "@typescript-eslint/parser";
import { Linter } from "eslint";
import errorset from "../../packages/errorset/src/index.ts";
import immutable from "../../packages/immutable/src/index.ts";
import query from "../../packages/query/src/index.ts";
import router from "../../packages/router/src/index.ts";
import solidjs from "../../packages/solidjs/src/index.ts";
import tsNoAssert from "../../packages/ts-no-assert/src/index.ts";
import type { PluginName } from "../../scripts/plugins.ts";

const plugins: Record<PluginName, unknown> = {
  errorset,
  immutable,
  "ts-no-assert": tsNoAssert,
  query,
  router,
  solidjs,
};

interface Case {
  rule: string;
  valid: string;
  invalid: string;
  messageId?: string;
}

const ERRORSET = `import { errorSet } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found"]).init();`;

const CASES: Record<PluginName, Case> = {
  errorset: {
    rule: "no-throw-errorset",
    valid: `${ERRORSET}\nexport function f(id: string) { return UserError.not_found\`missing\`({ id }); }`,
    invalid: `${ERRORSET}\nexport function f(id: string) { throw UserError.not_found\`missing\`({ id }); }`,
  },
  immutable: { rule: "no-let", valid: "const a: number = 1;", invalid: "let a: number = 1;" },
  "ts-no-assert": {
    rule: "no-type-assertion",
    valid: "const a = 1 as const;",
    invalid: "const a = value as string;",
  },
  query: {
    rule: "no-rest-destructuring",
    valid:
      "import { useQuery } from '@tanstack/react-query'; const q = useQuery({ queryKey: ['x'], queryFn: () => 1 });",
    invalid:
      "import { useQuery } from '@tanstack/react-query'; const { data, ...rest } = useQuery({ queryKey: ['x'], queryFn: () => 1 });",
  },
  router: {
    rule: "create-route-property-order",
    valid: "import { createRoute } from '@tanstack/react-router'; createRoute({ search: {}, loaderDeps: {} });",
    invalid: "import { createRoute } from '@tanstack/react-router'; createRoute({ loaderDeps: {}, search: {} });",
  },
  solidjs: {
    rule: "no-react-specific-props",
    valid: "const App = () => <label for='name'>Name</label>;",
    invalid: "const App = () => <label htmlFor='name'>Name</label>;",
  },
};

function lint(name: PluginName, rule: string, code: string) {
  const linter = new Linter({ configType: "flat" });
  return linter.verify(
    code,
    [
      {
        files: ["**/*.tsx"],
        plugins: { [name]: plugins[name] as never },
        languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
        rules: { [`${name}/${rule}`]: "error" },
      },
    ],
    "file.tsx",
  );
}

describe("ESLint 9 flat config + typescript-eslint parser", () => {
  for (const [name, c] of Object.entries(CASES) as [PluginName, Case][]) {
    test(`${name}/${c.rule}: valid code has no reports`, () => {
      const messages = lint(name, c.rule, c.valid);
      expect(messages.filter((m) => m.fatal)).toEqual([]);
      expect(messages).toHaveLength(0);
    });
    test(`${name}/${c.rule}: invalid code is reported`, () => {
      const messages = lint(name, c.rule, c.invalid);
      expect(messages.filter((m) => m.fatal)).toEqual([]);
      expect(messages.length).toBeGreaterThan(0);
      for (const m of messages) expect(m.ruleId).toBe(`${name}/${c.rule}`);
    });
  }

  // ts-no-assert accepts `as const` in typescript-eslint's AST (a TSTypeReference named
  // `const`) here; the oxlint runtime is covered by the RuleTester unit tests (as of oxlint
  // 1.47-1.93 it produces the same TSTypeReference shape; see TASK-008 notes).
  test("ts-no-assert: `as const` (typescript-eslint TSTypeReference shape) is allowed", () => {
    const parsed = tsParser.parseForESLint("const a = 1 as const;", { range: true });
    const decl = parsed.ast.body[0];
    const init = decl?.type === "VariableDeclaration" ? decl.declarations[0]?.init : undefined;
    const annotation = init && "typeAnnotation" in init ? init.typeAnnotation : undefined;
    expect(String(init?.type)).toBe("TSAsExpression");
    expect(annotation && "type" in annotation ? String(annotation.type) : undefined).toBe("TSTypeReference");
    expect(lint("ts-no-assert", "no-type-assertion", "const a = { b: 1 } as const;")).toHaveLength(0);
  });

  // Audit R9: jsx-no-undef kept per-file state in the createOnce closure, which the
  // ESLint compat wrapper reuses across files: a clean file linted after one with a
  // missing import was reported too.
  test("solidjs/jsx-no-undef: a clean file after an invalid one is not reported", () => {
    const linter = new Linter({ configType: "flat" });
    const config = [
      {
        files: ["**/*.tsx"],
        plugins: { solidjs: plugins.solidjs as never },
        languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
        rules: { "solidjs/jsx-no-undef": "error" as const },
      },
    ];
    const invalid = linter.verify("export const A = () => <Show when={true}>x</Show>;", config, "a.tsx");
    expect(invalid).toHaveLength(1);
    const clean = linter.verify(
      'import { Show } from "solid-js";\nexport const B = () => <Show when={true}>b</Show>;',
      config,
      "b.tsx",
    );
    expect(clean).toHaveLength(0);
  });

  // Audit R10: reactivity's import tracker lived in the createOnce closure, so a Solid
  // import in one file made a same-named local function in a later file count as Solid's.
  test("solidjs/reactivity: a file's result does not depend on a previously linted file", () => {
    const linter = new Linter({ configType: "flat" });
    const config = [
      {
        files: ["**/*.tsx"],
        plugins: { solidjs: plugins.solidjs as never },
        languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
        rules: { "solidjs/reactivity": "error" as const },
      },
    ];
    const b =
      "function createSignal<T>(v: T): [() => T] { return [() => v]; }\nexport function B() { const [count] = createSignal(0); console.log(count()); return <div />; }";
    const alone = linter.verify(b, config, "b.tsx");
    linter.verify(
      'import { createSignal } from "solid-js";\nexport function A() { const [n] = createSignal(0); return <div>{n()}</div>; }',
      config,
      "a.tsx",
    );
    const afterA = linter.verify(b, config, "b.tsx");
    expect(alone).toHaveLength(0);
    expect(afterA).toEqual(alone);
  });

  // Audit R15: the recommended preset works with the plugin registered under its
  // normalized name (the preset keys are `<name>/<rule>`).
  for (const [name, c] of Object.entries(CASES) as [PluginName, Case][]) {
    test(`${name}: configs.recommended spreads into a flat config`, () => {
      const plugin = plugins[name] as { configs: { recommended: { rules: Record<string, unknown> } } };
      const linter = new Linter({ configType: "flat" });
      const messages = linter.verify(
        c.invalid,
        [
          {
            files: ["**/*.tsx"],
            plugins: { [name]: plugin as never },
            languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
            rules: plugin.configs.recommended.rules as never,
          },
        ],
        "file.tsx",
      );
      expect(messages.filter((m) => m.fatal || /Definition for rule|could not find/i.test(m.message))).toEqual([]);
      for (const m of messages) expect(m.ruleId?.startsWith(`${name}/`)).toBe(true);
    });
  }
});
