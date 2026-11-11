import { eslintCompatPlugin } from "@oxlint/plugins";
import componentsReturnOnce from "./rules/components-return-once.ts";
import eventHandlers from "./rules/event-handlers.ts";
import importsRule from "./rules/imports.ts";
import jsxNoDuplicateProps from "./rules/jsx-no-duplicate-props.ts";
import jsxNoScriptUrl from "./rules/jsx-no-script-url.ts";
import jsxNoUndef from "./rules/jsx-no-undef.ts";
import jsxUsesVars from "./rules/jsx-uses-vars.ts";
import noArrayHandlers from "./rules/no-array-handlers.ts";
import noDestructure from "./rules/no-destructure.ts";
import noInnerhtml from "./rules/no-innerhtml.ts";
import noProxyApis from "./rules/no-proxy-apis.ts";
import noReactDeps from "./rules/no-react-deps.ts";
import noReactSpecificProps from "./rules/no-react-specific-props.ts";
import noUnknownNamespaces from "./rules/no-unknown-namespaces.ts";
import preferClasslist from "./rules/prefer-classlist.ts";
import preferFor from "./rules/prefer-for.ts";
import preferShow from "./rules/prefer-show.ts";
import reactivity from "./rules/reactivity.ts";
import selfClosingComp from "./rules/self-closing-comp.ts";
import styleProp from "./rules/style-prop.ts";

const plugin = {
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
};

// eslintCompatPlugin converts the rules in place and returns the same object.
// Passing a variable (not a literal) keeps `configs`, which its `Plugin` type omits.
eslintCompatPlugin(plugin);

export default plugin;
