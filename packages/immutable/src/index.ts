import { eslintCompatPlugin } from "@oxlint/plugins";
import immutableData from "./rules/immutable-data";
import noLet from "./rules/no-let";
import noPromiseReject from "./rules/no-promise-reject";
import noThrowStatements from "./rules/no-throw-statements";
import preferImmutableTypes from "./rules/prefer-immutable-types";
import preferPropertySignatures from "./rules/prefer-property-signatures";
import readonlyType from "./rules/readonly-type";
import typeDeclarationImmutability from "./rules/type-declaration-immutability";

const plugin = {
  meta: { name: "oxlint-plugin-immutable" },
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
      rules: {
        "functional/no-let": "error",
        "functional/no-throw-statements": "error",
        "functional/prefer-property-signatures": "error",
        "functional/prefer-immutable-types": ["error", { parameters: { enforcement: "ReadonlyShallow" } }],
        "functional/type-declaration-immutability": ["error", { ignoreInterfaces: false }],
      },
    },
  },
};

// eslintCompatPlugin converts the rules in place and returns the same object.
// Passing a variable (not a literal) keeps `configs`, which its `Plugin` type omits.
eslintCompatPlugin(plugin);

export default plugin;
