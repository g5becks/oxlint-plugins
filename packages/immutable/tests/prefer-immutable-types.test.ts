import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import plugin from "../src/index";

const rule = (plugin as any).rules["prefer-immutable-types"];

const tester = new RuleTester({
  languageOptions: {
    parser: parser as any,
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

tester.run("prefer-immutable-types", rule as any, {
  valid: ["function x(a: ReadonlyArray<string>): ReadonlyArray<string> { return a }"],
  invalid: [
    {
      code: "const items: string[] = [];",
      errors: [{ messageId: "variable" }],
    },
  ],
});
