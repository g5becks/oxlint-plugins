import { createPropertyOrderRule } from "../utils/create-property-order-rule";
import { mutationFunctions, mutationSortRules } from "../utils/constants";

export default createPropertyOrderRule(
  {
    name: "mutation-property-order",
    meta: {
      type: "problem",
      docs: {
        description: "Ensure correct order of inference-sensitive properties in useMutation()",
        recommended: "error",
      },
      messages: {
        invalidOrder: "Invalid order of properties for `{{function}}`.",
      },
      schema: [],
      hasSuggestions: true,
      fixable: "code",
    },
    defaultOptions: [],
  },
  mutationFunctions,
  mutationSortRules,
);
