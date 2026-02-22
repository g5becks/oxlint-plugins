import { RuleTester } from "eslint";
import plugin from "../src/index";

const rule = (plugin as any).rules["route-param-names"];

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

tester.run("route-param-names", rule as any, {
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
