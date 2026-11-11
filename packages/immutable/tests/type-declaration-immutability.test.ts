import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

const rule = ruleOf(plugin, "type-declaration-immutability");

const tester = ruleTester("ts");

tester.run("type-declaration-immutability", rule, {
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
    // Audit R7: readonly forms and unresolvable references
    "type A = ReadonlySet<string>",
    "type A = Required<{ readonly a?: string }>",
    "type A = Omit<{ readonly a: string; readonly b: string }, 'b'>",
    "type A = Partial<SomeType>",
    "type A = { readonly f: () => void; method(): void }",
    "type A = ({ readonly a: string })",
    "type A = 'x' | 'y'",
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
    // Audit R7: more mutable shapes
    { code: "type A = Set<string>", errors: [{ messageId: "notReadonly" }] },
    { code: "type A = WeakMap<object, string>", errors: [{ messageId: "notReadonly" }] },
    { code: "type A = Required<{ a?: string }>", errors: [{ messageId: "notReadonly" }] },
    { code: "type A = Pick<{ a: string; b: string }, 'a'>", errors: [{ messageId: "notReadonly" }] },
    { code: "type A = Omit<{ a: string; readonly b: string }, 'b'>", errors: [{ messageId: "notReadonly" }] },
    { code: "type A = { readonly a: string } | string[]", errors: [{ messageId: "notReadonly" }] },
    { code: "type A = { -readonly [K in 'a']: string }", errors: [{ messageId: "notReadonly" }] },
    { code: "type A = { [key: string]: number }", errors: [{ messageId: "notReadonly" }] },
    // Intersection where only constituent is a mutable literal
    {
      code: "type Foo = SomeBase & { mutableProp: string }",
      errors: [{ messageId: "notReadonly" }],
    },
  ],
});
