import { RuleTester } from "eslint"
import plugin from "../src/index.ts"

const rule = (plugin as any).rules["no-new-error-in-errorset-fn"]

const tester = new RuleTester({
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
})

const IMPORT = `import { errorSet } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "invalid"]).init();`

tester.run("no-new-error-in-errorset-fn", rule as any, {
  valid: [
    // No errorset import
    {
      code: `function getUser(id) { if (!id) throw new Error("required"); }`,
    },
    // throw new Error in a function that does NOT use errorset creation
    {
      code: `${IMPORT}
function otherFn() { throw new Error("boom"); }`,
    },
    // allowed via option
    {
      code: `${IMPORT}
function getUser(id) {
  if (!id) throw new TypeError("invalid");
  return UserError.invalid\`bad\`;
}`,
      options: [{ allowedBuiltins: ["TypeError"] }],
    },
    // throw inside .capture() first arg is exempt
    {
      code: `${IMPORT}
UserError.capture(() => {
  throw new Error("network");
}, (e) => UserError.invalid\`err\`);`,
    },
    // Second function does not use errorset — not flagged
    {
      code: `${IMPORT}
function getUser(id) {
  return UserError.not_found\`User \${"id"}\`({ id });
}
function otherFn() {
  throw new Error("different function, no errorset usage");
}`,
    },
  ],
  invalid: [
    // throw new Error inside a function that uses errorset creation
    {
      code: `${IMPORT}
function getUser(id) {
  if (!id) throw new Error("id is required");
  return UserError.not_found\`User \${"id"}\`({ id });
}`,
      errors: [{ messageId: "noNewError", data: { name: "Error" } }],
    },
    // throw new TypeError (not in allowedBuiltins by default)
    {
      code: `${IMPORT}
function getUser(id) {
  if (!id) throw new TypeError("invalid arg");
  return UserError.not_found\`User \${"id"}\`({ id });
}`,
      errors: [{ messageId: "noNewError", data: { name: "TypeError" } }],
    },
    // Arrow function
    {
      code: `${IMPORT}
const getUser = (id) => {
  if (!id) throw new Error("required");
  return UserError.invalid\`bad input\`;
};`,
      errors: [{ messageId: "noNewError", data: { name: "Error" } }],
    },
  ],
})
