import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "immutable-data");

const tester = ruleTester("tsx");

tester.run("immutable-data", rule, {
  valid: ["const a = { x: 1 }; const b = { ...a, x: 2 };"],
  invalid: [
    { code: "const a = { x: 1 }; a.x = 2;", errors: [{ messageId: "generic" }] },
    { code: "const a = [1]; a.push(2);", errors: [{ messageId: "array" }] },
  ],
});
