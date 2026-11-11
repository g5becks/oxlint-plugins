import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "prefer-property-signatures");

const tester = ruleTester("ts");

tester.run("prefer-property-signatures", rule, {
  valid: ["type T = { foo: () => string }"],
  invalid: [
    {
      code: "type T = { foo(): string }",
      output: "type T = { foo: () => string }",
      errors: [{ messageId: "generic" }],
    },
  ],
});
