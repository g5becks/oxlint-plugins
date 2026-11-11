import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "create-route-property-order");

const tester = ruleTester("tsx");

tester.run("create-route-property-order", rule, {
  valid: [
    {
      code: "import { createRoute } from '@tanstack/react-router'; createRoute({ search: {}, loaderDeps: {} });",
    },
  ],
  invalid: [
    {
      code: "import { createRoute } from '@tanstack/react-router'; createRoute({ loaderDeps: {}, search: {} });",
      output: "import { createRoute } from '@tanstack/react-router'; createRoute({ search: {}, loaderDeps: {} });",
      errors: [{ messageId: "invalidOrder" }],
    },
  ],
});
