import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "readonly-type");

const tester = ruleTester("ts");

tester.run("readonly-type", rule, {
  valid: ["type T = { readonly name: string }"],
  invalid: [
    {
      code: "type T = { name: string }",
      output: "type T = { readonly name: string }",
      errors: [{ messageId: "missingReadonly" }],
    },
  ],
});
