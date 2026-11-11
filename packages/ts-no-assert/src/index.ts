import { eslintCompatPlugin } from "@oxlint/plugins";
import noTypeAssertion from "./rules/no-type-assertion";

const plugin = {
  meta: { name: "oxlint-plugin-ts-no-assert" },
  rules: {
    "no-type-assertion": noTypeAssertion,
  },
  configs: {
    recommended: {
      rules: {
        "no-type-assertion/no-type-assertion": "error",
      },
    },
  },
};

// eslintCompatPlugin converts the rules in place and returns the same object.
// Passing a variable (not a literal) keeps `configs`, which its `Plugin` type omits.
eslintCompatPlugin(plugin);

export default plugin;
