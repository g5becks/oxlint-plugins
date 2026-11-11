import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "infinite-query-property-order");

const tester = ruleTester("tsx");

tester.run("infinite-query-property-order", rule, {
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
