import { eslintCompatPlugin } from "@oxlint/plugins";
import exhaustiveDeps from "./rules/exhaustive-deps.ts";
import infiniteQueryPropertyOrder from "./rules/infinite-query-property-order.ts";
import mutationPropertyOrder from "./rules/mutation-property-order.ts";
import noRestDestructuring from "./rules/no-rest-destructuring.ts";
import noUnstableDeps from "./rules/no-unstable-deps.ts";
import stableQueryClient from "./rules/stable-query-client.ts";

const plugin = {
  meta: { name: "oxlint-plugin-query" },
  rules: {
    "exhaustive-deps": exhaustiveDeps,
    "no-rest-destructuring": noRestDestructuring,
    "stable-query-client": stableQueryClient,
    "no-unstable-deps": noUnstableDeps,
    "infinite-query-property-order": infiniteQueryPropertyOrder,
    "mutation-property-order": mutationPropertyOrder,
  },
  configs: {
    recommended: {
      rules: {
        "query/exhaustive-deps": "error",
        "query/no-rest-destructuring": "warn",
        "query/stable-query-client": "error",
        "query/no-unstable-deps": "error",
        "query/infinite-query-property-order": "error",
        "query/mutation-property-order": "error",
      },
    },
  },
};

// eslintCompatPlugin converts the rules in place and returns the same object.
// Passing a variable (not a literal) keeps `configs`, which its `Plugin` type omits.
eslintCompatPlugin(plugin);

export default plugin;
