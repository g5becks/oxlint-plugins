import { RuleTester } from "eslint";
import plugin from "../src/index";

const rule = (plugin as any).rules["no-let"];

const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } });

tester.run("no-let", rule as any, {
  valid: ["const x = 1;"],
  invalid: [{ code: "let x = 1;", errors: [{ messageId: "generic" }] }],
});
