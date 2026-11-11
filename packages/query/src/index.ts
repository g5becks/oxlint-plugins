import { eslintCompatPlugin } from "@oxlint/plugins";
import exhaustiveDeps from "./rules/exhaustive-deps";
import infiniteQueryPropertyOrder from "./rules/infinite-query-property-order";
import mutationPropertyOrder from "./rules/mutation-property-order";
import noRestDestructuring from "./rules/no-rest-destructuring";
import noUnstableDeps from "./rules/no-unstable-deps";
import stableQueryClient from "./rules/stable-query-client";

const plugin = eslintCompatPlugin({
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
});

export default plugin;
