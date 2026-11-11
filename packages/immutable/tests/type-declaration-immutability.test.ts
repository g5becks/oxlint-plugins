import { RuleTester } from "eslint";
import parser from "@typescript-eslint/parser";
import plugin from "../src/index";

const rule = (plugin as any).rules["type-declaration-immutability"];

const tester = new RuleTester({
  languageOptions: {
    parser: parser as any,
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

tester.run("type-declaration-immutability", rule as any, {
  valid: [
    // Interface with all-readonly members
    "interface User { readonly name: string }",
    // Plain type literal with all-readonly members
    "type Foo = { readonly x: string }",
    // Intersection where the literal constituent is fully readonly
    "type FooProps = SomePrimitive.FooProps & { readonly class?: string }",
    // Intersection with multiple all-readonly literals
    "type FooProps = A & { readonly x: string } & { readonly y: number }",
    // Intersection with no literal constituents — skip (can't check without type checker)
    "type Foo = A & B",
    // Type reference only — skip
    "type Foo = SomePrimitive.Root",
  ],
  invalid: [
    // Interface with non-readonly members
    {
      code: "interface User { name: string }",
      errors: [{ messageId: "notReadonly" }],
    },
    // Plain type literal with non-readonly members
    {
      code: "type Foo = { x: string }",
      errors: [{ messageId: "notReadonly" }],
    },
    // Intersection where the literal has a non-readonly member (the common real-world pattern)
    {
      code: "type TabsListProps = SomePrimitive.TabsListProps & { class?: string }",
      errors: [{ messageId: "notReadonly" }],
    },
    // Intersection with generic base type and mutable literal (matches Kobalte patterns)
    {
      code: "type FooProps<T> = SomePrimitive.FooProps<T> & { class?: string | undefined }",
      errors: [{ messageId: "notReadonly" }],
    },
    // Multiple literal constituents — mutable second literal should trigger
    {
      code: "type FooProps = A & { readonly x: string } & { y: number }",
      errors: [{ messageId: "notReadonly" }],
    },
    // Intersection where only constituent is a mutable literal
    {
      code: "type Foo = SomeBase & { mutableProp: string }",
      errors: [{ messageId: "notReadonly" }],
    },
  ],
});
