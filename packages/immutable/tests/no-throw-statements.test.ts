import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "no-throw-statements");

const tester = ruleTester("tsx");

tester.run("no-throw-statements", rule, {
  valid: [{ code: "function x() { return 1; }" }],
  invalid: [{ code: "function x() { throw new Error('x'); }", errors: [{ messageId: "generic" }] }],
});
