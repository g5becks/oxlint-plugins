import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import plugin from "../src/index";

const rule = (plugin as any).rules["prefer-property-signatures"];

const tester = new RuleTester({
  languageOptions: {
    parser: parser as any,
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

tester.run("prefer-property-signatures", rule as any, {
  valid: ["type T = { foo: () => string }"],
  invalid: [
    {
      code: "type T = { foo(): string }",
      output: "type T = { foo: () => string }",
      errors: [{ messageId: "generic" }],
    },
  ],
});
