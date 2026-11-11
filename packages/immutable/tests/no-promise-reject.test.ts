import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "no-promise-reject");

const tester = ruleTester("tsx");

tester.run("no-promise-reject", rule, {
  valid: ["Promise.resolve(1);"],
  invalid: [
    { code: "Promise.reject(new Error('x'));", errors: [{ messageId: "generic" }] },
    { code: "new Promise((resolve, reject) => reject(new Error('x')));", errors: [{ messageId: "generic" }] },
  ],
});
