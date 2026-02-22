import { RuleTester } from "eslint";
import plugin from "../src/index";

const rule = (plugin as any).rules["no-throw-statements"];

const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } });

tester.run("no-throw-statements", rule as any, {
  valid: [{ code: "function x() { return 1; }" }],
  invalid: [{ code: "function x() { throw new Error('x'); }", errors: [{ messageId: "generic" }] }],
});
