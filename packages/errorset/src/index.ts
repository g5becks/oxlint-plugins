import { eslintCompatPlugin } from "@oxlint/plugins"
import noThrowErrorset from "./rules/no-throw-errorset.ts"
import noCatchErrorset from "./rules/no-catch-errorset.ts"
import noNewErrorInErrorsetFn from "./rules/no-new-error-in-errorset-fn.ts"
import preferGuardOverManualKindCheck from "./rules/prefer-guard-over-manual-kind-check.ts"
import noUnguardedDataAccess from "./rules/no-unguarded-data-access.ts"

const _base = eslintCompatPlugin({
    meta: { name: "oxlint-plugin-errorset" },
    rules: {
        "no-throw-errorset": noThrowErrorset,
        "no-catch-errorset": noCatchErrorset,
        "no-new-error-in-errorset-fn": noNewErrorInErrorsetFn,
        "prefer-guard-over-manual-kind-check": preferGuardOverManualKindCheck,
        "no-unguarded-data-access": noUnguardedDataAccess,
    },
})

const plugin = {
    ..._base,
    configs: {
        recommended: {
            rules: {
                "errorset/no-throw-errorset": "error",
                "errorset/no-catch-errorset": "error",
                "errorset/no-new-error-in-errorset-fn": "warn",
                "errorset/prefer-guard-over-manual-kind-check": "warn",
                "errorset/no-unguarded-data-access": "warn",
            },
        },
    },
}

export default plugin
