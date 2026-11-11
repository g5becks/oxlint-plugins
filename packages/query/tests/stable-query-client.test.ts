import { RuleTester } from "eslint";
import plugin from "../src/index";

const rule = (plugin as any).rules["stable-query-client"];

const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } });

tester.run("stable-query-client", rule as any, {
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
