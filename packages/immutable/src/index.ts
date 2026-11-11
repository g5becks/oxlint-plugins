import { eslintCompatPlugin } from "@oxlint/plugins";
import { PACKAGE_NAME, presetRules } from "./plugin-meta.ts";
import immutableData from "./rules/immutable-data.ts";
import noLet from "./rules/no-let.ts";
import noPromiseReject from "./rules/no-promise-reject.ts";
import noThrowStatements from "./rules/no-throw-statements.ts";
import preferImmutableTypes from "./rules/prefer-immutable-types.ts";
import preferPropertySignatures from "./rules/prefer-property-signatures.ts";
import readonlyType from "./rules/readonly-type.ts";
import typeDeclarationImmutability from "./rules/type-declaration-immutability.ts";

const plugin = {
  meta: { name: PACKAGE_NAME },
  rules: {
    "no-let": noLet,
    "no-throw-statements": noThrowStatements,
    "prefer-property-signatures": preferPropertySignatures,
    "prefer-immutable-types": preferImmutableTypes,
    "type-declaration-immutability": typeDeclarationImmutability,
    "no-promise-reject": noPromiseReject,
    "immutable-data": immutableData,
    "readonly-type": readonlyType,
  },
  configs: {
    recommended: {
      rules: presetRules({
        "no-let": "error",
        "no-throw-statements": "error",
        "prefer-property-signatures": "error",
        "prefer-immutable-types": ["error", { parameters: { enforcement: "ReadonlyShallow" } }],
        "type-declaration-immutability": ["error", { ignoreInterfaces: false }],
      }),
    },
  },
};

// eslintCompatPlugin converts the rules in place and returns the same object.
// Passing a variable (not a literal) keeps `configs`, which its `Plugin` type omits.
eslintCompatPlugin(plugin);

export default plugin;
