import { RuleTester } from "eslint"
import plugin from "../src/index.ts"

const rule = (plugin as any).rules["prefer-guard-over-manual-kind-check"]

const tester = new RuleTester({
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
})

const IMPORT = `import { errorSet, isErr } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "suspended"]).init();`

tester.run("prefer-guard-over-manual-kind-check", rule as any, {
    valid: [
        // No errorset import
        {
            code: `if (result.kind === "not_found") {}`,
        },
        // .kind check but NOT inside a prior guard block — conservative, not reported
        {
            code: `${IMPORT}
const result = getUser();
if (result.kind === "not_found") {}`,
        },
        // Already using the kind-level guard (no .kind === inside a guard block)
        {
            code: `${IMPORT}
const result = getUser();
if (isErr(result)) { if (UserError.not_found(result)) { console.log("ok"); } }`,
        },
        // Kind check on an unrelated variable (never passed to a guard)
        {
            code: `${IMPORT}
const x = someValue;
if (x.kind === "foo") {}`,
        },
    ],
    invalid: [
        // .kind === after isErr() guard in parent if
        {
            code: `${IMPORT}
const result = getUser();
if (isErr(result)) {
  if (result.kind === "not_found") {}
}`,
            errors: [
                {
                    messageId: "preferGuard",
                    suggestions: [
                        {
                            messageId: "preferGuard",
                            output: `${IMPORT}
const result = getUser();
if (isErr(result)) {
  if (UserError.not_found(result)) {}
}`,
                        },
                    ],
                },
            ],
        },
        // .kind === after UserError() guard
        {
            code: `${IMPORT}
const result = getUser();
if (UserError(result)) {
  if (result.kind === "suspended") {}
}`,
            errors: [
                {
                    messageId: "preferGuard",
                    suggestions: [
                        {
                            messageId: "preferGuard",
                            output: `${IMPORT}
const result = getUser();
if (UserError(result)) {
  if (UserError.suspended(result)) {}
}`,
                        },
                    ],
                },
            ],
        },
        // `"literal" === result.kind` (reversed)
        {
            code: `${IMPORT}
const result = getUser();
if (isErr(result)) {
  if ("not_found" === result.kind) {}
}`,
            errors: [
                {
                    messageId: "preferGuard",
                    suggestions: [
                        {
                            messageId: "preferGuard",
                            output: `${IMPORT}
const result = getUser();
if (isErr(result)) {
  if (UserError.not_found(result)) {}
}`,
                        },
                    ],
                },
            ],
        },
    ],
})
