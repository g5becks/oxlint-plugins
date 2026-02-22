import { RuleTester } from "eslint";
import plugin from "../src/index";

const rule = (plugin as any).rules["exhaustive-deps"];

const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } });

tester.run("exhaustive-deps", rule as any, {
  valid: [
    {
      code: "import { useQuery } from '@tanstack/react-query'; const userId = 1; useQuery({ queryKey: [userId], queryFn: () => fetch('/api/' + userId) });",
    },
  ],
  invalid: [
    {
      code: "import { useQuery } from '@tanstack/react-query'; function Component(){ const id = 1; useQuery({ queryKey: ['entity'], queryFn: () => api.getEntity(id) }); }",
      errors: [{ messageId: "missingDeps", suggestions: 1 }],
    },
  ],
});
