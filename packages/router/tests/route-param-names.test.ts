import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "route-param-names");

const tester = ruleTester("tsx");

tester.run("route-param-names", rule, {
  valid: [
    {
      code: "import { createFileRoute } from '@tanstack/react-router'; createFileRoute('/users/$userId')({ component: Users });",
    },
    {
      code: "import { createRoute } from '@tanstack/react-router'; createRoute({ path: '/posts/{$postId}' });",
    },
  ],
  invalid: [
    {
      code: "import { createFileRoute } from '@tanstack/react-router'; createFileRoute('/users/$123bad')({ component: Users });",
      errors: [{ messageId: "invalidParamName" }],
    },
  ],
});
