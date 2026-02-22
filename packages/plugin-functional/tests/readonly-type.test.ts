import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import plugin from "../src/index";

const rule = (plugin as any).rules["readonly-type"];

const tester = new RuleTester({
  languageOptions: {
    parser: parser as any,
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

tester.run("readonly-type", rule as any, {
  valid: ["type T = { readonly name: string }"],
  invalid: [
    {
      code: "type T = { name: string }",
      output: "type T = { readonly name: string }",
      errors: [{ messageId: "missingReadonly" }],
    },
  ],
});
