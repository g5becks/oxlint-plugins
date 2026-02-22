import { RuleTester } from "eslint";
import plugin from "../src/index";

const rule = (plugin as any).rules["no-promise-reject"];

const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } });

tester.run("no-promise-reject", rule as any, {
  valid: ["Promise.resolve(1);"],
  invalid: [
    { code: "Promise.reject(new Error('x'));", errors: [{ messageId: "generic" }] },
    { code: "new Promise((resolve, reject) => reject(new Error('x')));", errors: [{ messageId: "generic" }] },
  ],
});
