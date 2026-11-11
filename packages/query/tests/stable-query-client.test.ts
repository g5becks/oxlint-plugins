import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "stable-query-client");

const tester = ruleTester("tsx");

tester.run("stable-query-client", rule, {
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
