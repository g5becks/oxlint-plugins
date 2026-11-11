import { eslintCompatPlugin } from "@oxlint/plugins";
import { PACKAGE_NAME, presetRules } from "./plugin-meta.ts";
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
  meta: { name: PACKAGE_NAME },
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
      rules: presetRules({
        "jsx-no-duplicate-props": "error",
        "jsx-no-undef": "error",
        "jsx-uses-vars": "error",
        "no-unknown-namespaces": "error",
        "no-innerhtml": "error",
        "jsx-no-script-url": "error",
        "components-return-once": "warn",
        "no-destructure": "error",
        "prefer-for": "error",
        reactivity: "warn",
        "event-handlers": "warn",
        imports: "warn",
        "style-prop": "warn",
        "no-react-deps": "warn",
        "no-react-specific-props": "warn",
        "self-closing-comp": "warn",
        "no-array-handlers": "off",
        "prefer-show": "off",
        "no-proxy-apis": "off",
        "prefer-classlist": "off",
      }),
    },
  },
};

// eslintCompatPlugin converts the rules in place and returns the same object.
// Passing a variable (not a literal) keeps `configs`, which its `Plugin` type omits.
eslintCompatPlugin(plugin);

export default plugin;
