import { RuleTester } from "eslint";
import plugin from "../src/index";

const rule = (plugin as any).rules["immutable-data"];

const tester = new RuleTester({ languageOptions: { ecmaVersion: "latest", sourceType: "module" } });

tester.run("immutable-data", rule as any, {
  valid: ["const a = { x: 1 }; const b = { ...a, x: 2 };"],
  invalid: [
    { code: "const a = { x: 1 }; a.x = 2;", errors: [{ messageId: "generic" }] },
    { code: "const a = [1]; a.push(2);", errors: [{ messageId: "array" }] },
  ],
});
