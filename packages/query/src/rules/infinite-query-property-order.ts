import { createPropertyOrderRule } from "../utils/create-property-order-rule";
import { infiniteQueryFunctions, infiniteQuerySortRules } from "../utils/constants";

export default createPropertyOrderRule(
  {
    name: "infinite-query-property-order",
    meta: {
      type: "problem" as const,
      docs: {
        description: "Ensure correct order of inference sensitive properties for infinite queries",
        recommended: "error",
      },
      messages: {
        invalidOrder: "Invalid order of properties for `{{function}}`.",
      },
      schema: [],
      hasSuggestions: true,
      fixable: "code" as const,
    },
    defaultOptions: [],
  },
  infiniteQueryFunctions,
  infiniteQuerySortRules,
);
