import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "no-rest-destructuring");

const tester = ruleTester("tsx");

tester.run("no-rest-destructuring", rule, {
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
