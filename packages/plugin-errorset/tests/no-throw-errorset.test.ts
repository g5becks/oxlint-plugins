import { RuleTester } from "eslint"
import plugin from "../src/index.ts"

const rule = (plugin as any).rules["no-throw-errorset"]

const tester = new RuleTester({
  languageOptions: { ecmaVersion: "latest", sourceType: "module" },
})

const IMPORT = `import { errorSet } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "invalid"]).init();`

tester.run("no-throw-errorset", rule as any, {
  valid: [
    // No errorset import — ignore
    {
      code: `function f() { throw new Error("boom"); }`,
    },
    // Correct usage: return instead of throw
    {
      code: `${IMPORT}
function getUser(id) {
  return UserError.not_found\`User \${"id"} not found\`({ id });
}`,
    },
    // Throw inside .capture() target function is allowed
    {
      code: `${IMPORT}
UserError.capture(() => {
  throw new Error("network");
}, (e) => UserError.invalid\`Error\`);`,
    },
    // Throw of a non-errorset value
    {
      code: `${IMPORT}
function getUser(id) {
  throw new Error("generic");
}`,
    },
  ],
  invalid: [
    // Pattern A: throw SomeError.kind`...`(data)
    {
      code: `${IMPORT}
function getUser(id) {
  throw UserError.not_found\`User \${"id"} not found\`({ id });
}`,
      output: `${IMPORT}
function getUser(id) {
  return UserError.not_found\`User \${"id"} not found\`({ id });
}`,
      errors: [{ messageId: "noThrow" }],
    },
    // Pattern B: throw SomeError.kind`...` (zero-arg callable)
    {
      code: `${IMPORT}
function getUser() {
  throw UserError.invalid\`Invalid input\`;
}`,
      output: `${IMPORT}
function getUser() {
  return UserError.invalid\`Invalid input\`;
}`,
      errors: [{ messageId: "noThrow" }],
    },
    // Arrow function
    {
      code: `${IMPORT}
const getUser = (id) => { throw UserError.not_found\`User \${"id"}\`({ id }); }`,
      output: `${IMPORT}
const getUser = (id) => { return UserError.not_found\`User \${"id"}\`({ id }); }`,
      errors: [{ messageId: "noThrow" }],
    },
  ],
})
