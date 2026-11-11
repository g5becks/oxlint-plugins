import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "exhaustive-deps");

const tester = ruleTester("tsx");

tester.run("exhaustive-deps", rule, {
  valid: [
    {
      code: "import { useQuery } from '@tanstack/react-query'; const userId = 1; useQuery({ queryKey: [userId], queryFn: () => fetch('/api/' + userId) });",
    },
  ],
  invalid: [
    {
      code: "import { useQuery } from '@tanstack/react-query'; function Component(){ const id = 1; useQuery({ queryKey: ['entity'], queryFn: () => api.getEntity(id) }); }",
      errors: [
        {
          messageId: "missingDeps",
          suggestions: [
            {
              messageId: "fixTo",
              output:
                "import { useQuery } from '@tanstack/react-query'; function Component(){ const id = 1; useQuery({ queryKey: ['entity', id], queryFn: () => api.getEntity(id) }); }",
            },
          ],
        },
      ],
    },
  ],
});
