import { expect, test } from "bun:test";
import { RuleTester } from "eslint";
import functionalPlugin from "../../packages/plugin-functional/src/index";
import queryPlugin from "../../packages/plugin-query/src/index";
import routerPlugin from "../../packages/plugin-router/src/index";
import solidPlugin from "../../packages/plugin-solid/src/index";

const pluginEntries = [
  ["router", routerPlugin],
  ["query", queryPlugin],
  ["functional", functionalPlugin],
  ["solid", solidPlugin],
] as const;

test("all plugin rules are ESLint-compatible", () => {
  for (const [name, plugin] of pluginEntries) {
    const rules = (plugin as any).rules;
    expect(rules).toBeDefined();

    for (const [ruleName, rule] of Object.entries<any>(rules)) {
      expect(typeof rule.create).toBe("function");
      expect(rule.meta).toBeDefined();
      expect(rule.meta.docs).toBeDefined();
      if (!rule.meta.docs?.description) {
        throw new Error(`Missing docs description for ${name}/${ruleName}`);
      }
    }
  }
});

const jsTester = new RuleTester({
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
});

jsTester.run("router/create-route-property-order", (routerPlugin as any).rules["create-route-property-order"], {
  valid: [
    {
      code: "import { createRoute } from '@tanstack/react-router'; createRoute({ search: {}, loaderDeps: {} });",
    },
  ],
  invalid: [
    {
      code: "import { createRoute } from '@tanstack/react-router'; createRoute({ loaderDeps: {}, search: {} });",
      output: "import { createRoute } from '@tanstack/react-router'; createRoute({ search: {}, loaderDeps: {} });",
      errors: [{ messageId: "invalidOrder" }],
    },
  ],
});

jsTester.run("query/no-rest-destructuring", (queryPlugin as any).rules["no-rest-destructuring"], {
  valid: [
    {
      code: "import { useQuery } from '@tanstack/react-query'; const query = useQuery({ queryKey: ['x'], queryFn: () => 1 });",
    },
  ],
  invalid: [
    {
      code: "import { useQuery } from '@tanstack/react-query'; const { data, ...rest } = useQuery({ queryKey: ['x'], queryFn: () => 1 });",
      errors: [{ messageId: "objectRestDestructure" }],
    },
  ],
});

jsTester.run("functional/no-promise-reject", (functionalPlugin as any).rules["no-promise-reject"], {
  valid: [{ code: "Promise.resolve(1);" }],
  invalid: [
    {
      code: "Promise.reject(new Error('x'));",
      errors: [{ messageId: "generic" }],
    },
  ],
});

const jsxTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

jsxTester.run("solid/no-react-specific-props", (solidPlugin as any).rules["no-react-specific-props"], {
  valid: [{ code: "const App = () => <label for='name'>Name</label>;" }],
  invalid: [
    {
      code: "const App = () => <label htmlFor='name'>Name</label>;",
      output: "const App = () => <label for='name'>Name</label>;",
      errors: [{ messageId: "prefer" }],
    },
  ],
});
