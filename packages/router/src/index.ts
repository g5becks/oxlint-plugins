import { eslintCompatPlugin } from "@oxlint/plugins";
import { PACKAGE_NAME, presetRules } from "./plugin-meta.ts";
import createRoutePropertyOrder from "./rules/create-route-property-order.ts";
import routeParamNames from "./rules/route-param-names.ts";

const plugin = {
  meta: { name: PACKAGE_NAME },
  rules: {
    "create-route-property-order": createRoutePropertyOrder,
    "route-param-names": routeParamNames,
  },
  configs: {
    recommended: {
      rules: presetRules({
        "create-route-property-order": "error",
        "route-param-names": "error",
      }),
    },
  },
};

// eslintCompatPlugin converts the rules in place and returns the same object.
// Passing a variable (not a literal) keeps `configs`, which its `Plugin` type omits.
eslintCompatPlugin(plugin);

export default plugin;
