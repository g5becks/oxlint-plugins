import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "prefer-immutable-types");

const tester = ruleTester("ts");

tester.run("prefer-immutable-types", rule, {
  valid: ["function x(a: ReadonlyArray<string>): ReadonlyArray<string> { return a }"],
  invalid: [
    {
      code: "const items: string[] = [];",
      errors: [{ messageId: "variable" }],
    },
  ],
});
