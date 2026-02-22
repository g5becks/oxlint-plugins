import { RuleTester } from "eslint";
import plugin from "../src/index";

const rule = (plugin as any).rules["create-route-property-order"];

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

tester.run("create-route-property-order", rule as any, {
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
