import { RuleTester } from "eslint";
import plugin from "../src/index";

const rule = (plugin as any).rules["mutation-property-order"];

const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } });

tester.run("mutation-property-order", rule as any, {
  valid: [
    {
      code: "import { useMutation } from '@tanstack/react-query'; useMutation({ onMutate: () => {}, onError: () => {} });",
    },
  ],
  invalid: [
    {
      code: "import { useMutation } from '@tanstack/react-query'; useMutation({ onError: () => {}, onMutate: () => {} });",
      output: "import { useMutation } from '@tanstack/react-query'; useMutation({ onMutate: () => {}, onError: () => {} });",
      errors: [{ messageId: "invalidOrder" }],
    },
  ],
});
