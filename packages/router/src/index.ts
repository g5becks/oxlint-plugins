import { eslintCompatPlugin } from "@oxlint/plugins";
import createRoutePropertyOrder from "./rules/create-route-property-order";
import routeParamNames from "./rules/route-param-names";

const plugin = {
  meta: { name: "oxlint-plugin-router" },
  rules: {
    "create-route-property-order": createRoutePropertyOrder,
    "route-param-names": routeParamNames,
  },
  configs: {
    recommended: {
      rules: {
        "router/create-route-property-order": "error",
        "router/route-param-names": "error",
      },
    },
  },
};

// eslintCompatPlugin converts the rules in place and returns the same object.
// Passing a variable (not a literal) keeps `configs`, which its `Plugin` type omits.
eslintCompatPlugin(plugin);

export default plugin;
