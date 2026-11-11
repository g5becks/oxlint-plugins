import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "no-let");

const tester = ruleTester("tsx");

tester.run("no-let", rule, {
  valid: ["const x = 1;"],
  invalid: [{ code: "let x = 1;", errors: [{ messageId: "generic" }] }],
});
