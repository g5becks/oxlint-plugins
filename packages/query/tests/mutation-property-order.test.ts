import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "mutation-property-order");

const tester = ruleTester("tsx");

tester.run("mutation-property-order", rule, {
  valid: [
    {
      code: "import { useMutation } from '@tanstack/react-query'; useMutation({ onMutate: () => {}, onError: () => {} });",
    },
  ],
  invalid: [
    {
      code: "import { useMutation } from '@tanstack/react-query'; useMutation({ onError: () => {}, onMutate: () => {} });",
      output:
        "import { useMutation } from '@tanstack/react-query'; useMutation({ onMutate: () => {}, onError: () => {} });",
      errors: [{ messageId: "invalidOrder" }],
    },
  ],
});
