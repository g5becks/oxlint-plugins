import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import plugin from "../src/index";

const rule = (plugin as any).rules["self-closing-comp"];

const tester = new RuleTester({
  languageOptions: {
    parser: parser as any,
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

tester.run("self-closing-comp", rule as any, {
  valid: [
    {
      code: "import { Show, createSignal } from 'solid-js'; const [count] = createSignal(1); const App = () => <Show when={count()}>ok</Show>;",
    },
  ],
  invalid: [],
});
