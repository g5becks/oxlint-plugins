import { RuleTester } from "eslint"
import plugin from "../src/index.ts"

const rule = (plugin as any).rules["no-unguarded-data-access"]

const tester = new RuleTester({
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
})

const IMPORT = `import { errorSet, isErr } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "suspended"]).init();`

tester.run("no-unguarded-data-access", rule as any, {
    valid: [
        // No errorset import
        {
            code: `const result = getUser(); console.log(result.data);`,
        },
        // Accessing .data inside a UserError() guard's consequent
        {
            code: `${IMPORT}
const result = getUser();
if (UserError(result)) { console.log(result.data); }`,
        },
        // Accessing .kind inside isErr() guard's consequent
        {
            code: `${IMPORT}
const result = getUser();
if (isErr(result)) { console.log(result.kind); }`,
        },
        // Accessing .message inside kind-level guard
        {
            code: `${IMPORT}
const result = getUser();
if (UserError.not_found(result)) { console.log(result.message); }`,
        },
        // Variable never passed to a guard — not tracked, not reported
        {
            code: `${IMPORT}
const user = getUser();
console.log(user.data);`,
        },
        // Access inside if(isErr(result) && ...) — the guard is on the left of &&
        {
            code: `${IMPORT}
const result = getUser();
if (isErr(result)) { console.log(result.data); }`,
        },
    ],
    invalid: [
        // .data accessed after guard call but OUTSIDE the guard block
        {
            code: `${IMPORT}
const result = getUser();
if (UserError(result)) { console.log("handled"); }
console.log(result.data);`,
            errors: [{ messageId: "unguardedAccess", data: { prop: "data", name: "result" } }],
        },
        // .kind accessed outside guard
        {
            code: `${IMPORT}
const result = getUser();
if (isErr(result)) { console.log("handled"); }
console.log(result.kind);`,
            errors: [{ messageId: "unguardedAccess", data: { prop: "kind", name: "result" } }],
        },
        // .message accessed after guard call, outside the block
        {
            code: `${IMPORT}
const result = getUser();
UserError(result);
console.log(result.message);`,
            errors: [{ messageId: "unguardedAccess", data: { prop: "message", name: "result" } }],
        },
        // .cause accessed outside guard
        {
            code: `${IMPORT}
const result = getUser();
if (UserError(result)) { console.log("handled"); }
console.log(result.cause);`,
            errors: [{ messageId: "unguardedAccess", data: { prop: "cause", name: "result" } }],
        },
    ],
})
