import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "no-unknown-namespaces");

const tester = ruleTester("tsx");

tester.run("no-unknown-namespaces", rule, {
  valid: [
    {
      code: "import { Show, createSignal } from 'solid-js'; const [count] = createSignal(1); const App = () => <Show when={count()}>ok</Show>;",
    },
  ],
  invalid: [],
});
