import { eslintCompatPlugin } from "@oxlint/plugins";
import noTypeAssertion from "./rules/no-type-assertion";

const plugin = eslintCompatPlugin({
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
});

export default plugin;
