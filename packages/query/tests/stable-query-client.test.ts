import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "stable-query-client");

const tester = ruleTester("tsx");

const IMPORT = "import { QueryClient } from '@tanstack/react-query';";

tester.run("stable-query-client", rule, {
  valid: [{ code: `${IMPORT} const client = new QueryClient();` }],
  invalid: [
    // No React import: `React.useState` would be an undefined reference, so it is only suggested
    // (TASK-026 fix safety; upstream autofixes, see PARITY.md#query-stable-query-client-no-react-import).
    {
      code: `${IMPORT} function App() { const client = new QueryClient(); return client; }`,
      output: null,
      errors: [
        {
          messageId: "unstable",
          suggestions: [
            {
              messageId: "fixTo",
              output: `${IMPORT} function App() { const [client] = React.useState(() => new QueryClient()); return client; }`,
            },
          ],
        },
      ],
    },
    // `useState` imported by name: autofix with the local name.
    {
      code: `import { useState as useSt } from "react"; ${IMPORT} function App() { const client = new QueryClient(); return client; }`,
      output: `import { useState as useSt } from "react"; ${IMPORT} function App() { const [client] = useSt(() => new QueryClient()); return client; }`,
      errors: [{ messageId: "unstable" }],
    },
    // React namespace imported: autofix with `<namespace>.useState`.
    {
      code: `import * as R from "react"; ${IMPORT} function App() { const client = new QueryClient(); return client; }`,
      output: `import * as R from "react"; ${IMPORT} function App() { const [client] = R.useState(() => new QueryClient()); return client; }`,
      errors: [{ messageId: "unstable" }],
    },
  ],
});
