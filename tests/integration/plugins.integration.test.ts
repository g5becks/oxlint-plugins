import { expect, test } from "bun:test";
import { RuleTester } from "eslint";
import functionalPlugin from "../../packages/plugin-functional/src/index";
import queryPlugin from "../../packages/plugin-query/src/index";
import routerPlugin from "../../packages/plugin-router/src/index";
import solidPlugin from "../../packages/plugin-solid/src/index";

test("all plugins expose core rules", () => {
  expect(Object.keys((routerPlugin as any).rules)).toContain("route-param-names");
  expect(Object.keys((queryPlugin as any).rules)).toContain("stable-query-client");
  expect(Object.keys((functionalPlugin as any).rules)).toContain("no-let");
  expect(Object.keys((solidPlugin as any).rules)).toContain("reactivity");
});

test("plugins provide recommended configs", () => {
  expect((routerPlugin as any).configs?.recommended).toBeDefined();
  expect((queryPlugin as any).configs?.recommended).toBeDefined();
  expect((functionalPlugin as any).configs?.recommended).toBeDefined();
  expect((solidPlugin as any).configs?.recommended).toBeDefined();
});

const jsTester = new RuleTester({
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
});

jsTester.run("router/route-param-names", (routerPlugin as any).rules["route-param-names"], {
  valid: [
    {
      code: "import { createFileRoute } from '@tanstack/react-router'; createFileRoute('/users/$userId')({ component: Users });",
    },
  ],
  invalid: [
    {
      code: "import { createFileRoute } from '@tanstack/react-router'; createFileRoute('/users/$123bad')({ component: Users });",
      errors: [{ messageId: "invalidParamName" }],
    },
  ],
});

jsTester.run("query/stable-query-client", (queryPlugin as any).rules["stable-query-client"], {
  valid: [{ code: "import { QueryClient } from '@tanstack/react-query'; const client = new QueryClient();" }],
  invalid: [
    {
      code: "import { QueryClient } from '@tanstack/react-query'; function App() { const client = new QueryClient(); return client; }",
      output:
        "import { QueryClient } from '@tanstack/react-query'; function App() { const [client] = React.useState(() => new QueryClient()); return client; }",
      errors: [{ messageId: "unstable" }],
    },
  ],
});

jsTester.run("functional/no-let", (functionalPlugin as any).rules["no-let"], {
  valid: [{ code: "const x = 1;" }],
  invalid: [
    {
      code: "let x = 1;",
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

jsxTester.run("solid/jsx-no-script-url", (solidPlugin as any).rules["jsx-no-script-url"], {
  valid: [{ code: "const App = () => <a href='https://example.com'>ok</a>;" }],
  invalid: [
    {
      code: "const App = () => <a href='javascript:alert(1)'>x</a>;",
      errors: [{ messageId: "noJSURL" }],
    },
  ],
});
