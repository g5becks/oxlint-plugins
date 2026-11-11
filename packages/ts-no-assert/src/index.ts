import { eslintCompatPlugin } from "@oxlint/plugins";
import { PACKAGE_NAME, presetRules } from "./plugin-meta.ts";
import noTypeAssertion from "./rules/no-type-assertion.ts";

const plugin = {
  meta: { name: PACKAGE_NAME },
  rules: {
    "no-type-assertion": noTypeAssertion,
  },
  configs: {
    recommended: {
      rules: presetRules({
        "no-type-assertion": "error",
      }),
    },
  },
};

// eslintCompatPlugin converts the rules in place and returns the same object.
// Passing a variable (not a literal) keeps `configs`, which its `Plugin` type omits.
eslintCompatPlugin(plugin);

export default plugin;
