import { eslintCompatPlugin } from "@oxlint/plugins";
import componentsReturnOnce from "./rules/components-return-once";
import eventHandlers from "./rules/event-handlers";
import importsRule from "./rules/imports";
import jsxNoDuplicateProps from "./rules/jsx-no-duplicate-props";
import jsxNoScriptUrl from "./rules/jsx-no-script-url";
import jsxNoUndef from "./rules/jsx-no-undef";
import jsxUsesVars from "./rules/jsx-uses-vars";
import noArrayHandlers from "./rules/no-array-handlers";
import noDestructure from "./rules/no-destructure";
import noInnerhtml from "./rules/no-innerhtml";
import noProxyApis from "./rules/no-proxy-apis";
import noReactDeps from "./rules/no-react-deps";
import noReactSpecificProps from "./rules/no-react-specific-props";
import noUnknownNamespaces from "./rules/no-unknown-namespaces";
import preferClasslist from "./rules/prefer-classlist";
import preferFor from "./rules/prefer-for";
import preferShow from "./rules/prefer-show";
import reactivity from "./rules/reactivity";
import selfClosingComp from "./rules/self-closing-comp";
import styleProp from "./rules/style-prop";

const plugin = eslintCompatPlugin({
  meta: { name: "oxlint-plugin-solidjs" },
  rules: {
    "components-return-once": componentsReturnOnce,
    "event-handlers": eventHandlers,
    imports: importsRule,
    "jsx-no-duplicate-props": jsxNoDuplicateProps,
    "jsx-no-script-url": jsxNoScriptUrl,
    "jsx-no-undef": jsxNoUndef,
    "jsx-uses-vars": jsxUsesVars,
    "no-array-handlers": noArrayHandlers,
    "no-destructure": noDestructure,
    "no-innerhtml": noInnerhtml,
    "no-proxy-apis": noProxyApis,
    "no-react-deps": noReactDeps,
    "no-react-specific-props": noReactSpecificProps,
    "no-unknown-namespaces": noUnknownNamespaces,
    "prefer-classlist": preferClasslist,
    "prefer-for": preferFor,
    "prefer-show": preferShow,
    reactivity,
    "self-closing-comp": selfClosingComp,
    "style-prop": styleProp,
  },
  configs: {
    recommended: {
      rules: {
        "solid/jsx-no-duplicate-props": "error",
        "solid/jsx-no-undef": "error",
        "solid/jsx-uses-vars": "error",
        "solid/no-unknown-namespaces": "error",
        "solid/no-innerhtml": "error",
        "solid/jsx-no-script-url": "error",
        "solid/components-return-once": "warn",
        "solid/no-destructure": "error",
        "solid/prefer-for": "error",
        "solid/reactivity": "warn",
        "solid/event-handlers": "warn",
        "solid/imports": "warn",
        "solid/style-prop": "warn",
        "solid/no-react-deps": "warn",
        "solid/no-react-specific-props": "warn",
        "solid/self-closing-comp": "warn",
        "solid/no-array-handlers": "off",
        "solid/prefer-show": "off",
        "solid/no-proxy-apis": "off",
        "solid/prefer-classlist": "off",
      },
    },
  },
});

export default plugin;
