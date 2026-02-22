import { RuleTester } from "eslint";
import plugin from "../src/index";

const rule = (plugin as any).rules["infinite-query-property-order"];

const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } });

tester.run("infinite-query-property-order", rule as any, {
  valid: [
    {
      code: "import { useInfiniteQuery } from '@tanstack/react-query'; useInfiniteQuery({ queryFn: () => 1, getNextPageParam: () => 2 });",
    },
  ],
  invalid: [
    {
      code: "import { useInfiniteQuery } from '@tanstack/react-query'; useInfiniteQuery({ getNextPageParam: () => 2, queryFn: () => 1 });",
      output:
        "import { useInfiniteQuery } from '@tanstack/react-query'; useInfiniteQuery({ queryFn: () => 1, getNextPageParam: () => 2 });",
      errors: [{ messageId: "invalidOrder" }],
    },
  ],
});
