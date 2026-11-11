import { eslintCompatPlugin } from "@oxlint/plugins";
import { PACKAGE_NAME, presetRules } from "./plugin-meta.ts";
import noThrowErrorset from "./rules/no-throw-errorset.ts";
import noCatchErrorset from "./rules/no-catch-errorset.ts";
import noNewErrorInErrorsetFn from "./rules/no-new-error-in-errorset-fn.ts";
import preferGuardOverManualKindCheck from "./rules/prefer-guard-over-manual-kind-check.ts";
import noUnguardedDataAccess from "./rules/no-unguarded-data-access.ts";

const plugin = {
  meta: { name: PACKAGE_NAME },
  rules: {
    "no-throw-errorset": noThrowErrorset,
    "no-catch-errorset": noCatchErrorset,
    "no-new-error-in-errorset-fn": noNewErrorInErrorsetFn,
    "prefer-guard-over-manual-kind-check": preferGuardOverManualKindCheck,
    "no-unguarded-data-access": noUnguardedDataAccess,
  },
  configs: {
    recommended: {
      rules: presetRules({
        "no-throw-errorset": "error",
        "no-catch-errorset": "error",
        "no-new-error-in-errorset-fn": "warn",
        "prefer-guard-over-manual-kind-check": "warn",
        "no-unguarded-data-access": "warn",
      }),
    },
  },
};

// eslintCompatPlugin converts the rules in place and returns the same object.
// Passing a variable (not a literal) keeps `configs`, which its `Plugin` type omits.
eslintCompatPlugin(plugin);

export default plugin;
