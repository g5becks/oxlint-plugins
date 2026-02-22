import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import plugin from "../src/index";

const rule = (plugin as any).rules["no-type-assertion"];

// Tester for plain TypeScript (.ts) — angle-bracket assertions are valid syntax here
const tsTester = new RuleTester({
  languageOptions: {
    parser: parser as any,
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

// Tester for TypeScript + JSX (.tsx) — angle-bracket assertions are syntactically
// illegal in JSX files (conflicts with JSX tags), so only `as` and `!` are tested here
const tsxTester = new RuleTester({
  languageOptions: {
    parser: parser as any,
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

tsTester.run("no-type-assertion (.ts)", rule as any, {
  valid: [
    // as const and as unknown are always allowed
    { code: "const foo = 42 as const" },
    { code: "const foo = 42 as unknown" },
    // as unknown in function argument
    { code: "fn(value as unknown)" },
    // as const on objects
    { code: "const obj = { a: 1 } as const" },
    // Angle-bracket const and unknown are allowed
    { code: "const foo = <const>42" },
    { code: "const foo = <unknown>42" },
  ],
  invalid: [
    // as operator — specific types
    {
      code: "const foo = 42 as number",
      errors: [{ messageId: "asAssertion" }],
    },
    {
      code: "const foo = 42 as string",
      errors: [{ messageId: "asAssertion" }],
    },
    // as any is forbidden
    {
      code: "const foo = 42 as any",
      errors: [{ messageId: "asAssertion" }],
    },
    // as with a user-defined type
    {
      code: "const foo = bar as MyType",
      errors: [{ messageId: "asAssertion" }],
    },
    // Double cast produces two errors
    {
      code: "const foo = bar as any as MyType",
      errors: [{ messageId: "asAssertion" }, { messageId: "asAssertion" }],
    },
    // Angle-bracket — specific types
    {
      code: "const foo = <number>42",
      errors: [{ messageId: "angleBracketAssertion" }],
    },
    {
      code: "const foo = <string>value",
      errors: [{ messageId: "angleBracketAssertion" }],
    },
    // Non-null assertion on optional property
    {
      code: "const foo: { a?: number } = { a: 42 }; const bar = foo.a! + 1;",
      errors: [{ messageId: "nonNullAssertion" }],
    },
    // Chained non-null assertion
    {
      code: "const foo: { a?: { b: number } } = { a: { b: 42 } }; const bar = foo.a!.b + 1",
      errors: [{ messageId: "nonNullAssertion" }],
    },
    // Non-null on function call result
    {
      code: "const el = document.getElementById('app')!",
      errors: [{ messageId: "nonNullAssertion" }],
    },
  ],
});

tsxTester.run("no-type-assertion (.tsx)", rule as any, {
  valid: [
    // as const and as unknown still allowed inside JSX
    { code: "const foo = 42 as const" },
    { code: "const foo = 42 as unknown" },
    { code: "const el = <div class={value as unknown} />" },
  ],
  invalid: [
    // as inside JSX attribute
    {
      code: "const x = <div id={value as string} />",
      errors: [{ messageId: "asAssertion" }],
    },
    // as in JSX expression
    {
      code: "const x = <div>{(value as string).toUpperCase()}</div>",
      errors: [{ messageId: "asAssertion" }],
    },
    // Non-null in JSX attribute
    {
      code: "const x = <div id={maybeNull!} />",
      errors: [{ messageId: "nonNullAssertion" }],
    },
  ],
});
