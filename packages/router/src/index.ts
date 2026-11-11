import { eslintCompatPlugin } from "@oxlint/plugins";
import createRoutePropertyOrder from "./rules/create-route-property-order";
import routeParamNames from "./rules/route-param-names";

const plugin = eslintCompatPlugin({
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
});

export default plugin;
