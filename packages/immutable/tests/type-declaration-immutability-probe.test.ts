import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// Audit R7 probe: 22 declarations, expected results taken from upstream
// eslint-plugin-functional@10.0.1 (type-aware; immutability ReadonlyShallow, comparator AtLeast,
// ignoreInterfaces false), run on 2026-11-11 (TASK-022). The port must match at least 21 of 22.
const rule = ruleOf(plugin, "type-declaration-immutability");

ruleTester("ts").run("type-declaration-immutability: 22-case upstream probe (audit R7)", rule, {
  valid: [
    "export type T09 = { readonly items: string[] };",
    "export type T10 = { readonly a: string };",
    "export type T12 = readonly string[];",
    "export type T13 = ReadonlyArray<string>;",
    "export type T14 = readonly [string, number];",
    'export type T15 = { readonly [K in "a" | "b"]: string };',
    "export type T16 = Readonly<{ a: string }>;",
    "export interface T17 { readonly a: string }",
    "export type T19 = string;",
    "export type T20 = { readonly a: string } & { readonly b: number };",
    "export type T22 = ReadonlyMap<string, number>;",
  ],
  invalid: [
    { code: "export type T01 = { a: string } | { b: string };", errors: [{ messageId: "notReadonly" }] },
    { code: "export type T02 = string[];", errors: [{ messageId: "notReadonly" }] },
    { code: "export type T03 = Map<string, number>;", errors: [{ messageId: "notReadonly" }] },
    { code: 'export type T04 = { [K in "a" | "b"]: string };', errors: [{ messageId: "notReadonly" }] },
    { code: "export type T05 = Partial<{ a: string }>;", errors: [{ messageId: "notReadonly" }] },
    { code: "export type T06 = Record<string, number>;", errors: [{ messageId: "notReadonly" }] },
    { code: "export type T07 = Array<{ readonly a: string }>;", errors: [{ messageId: "notReadonly" }] },
    { code: "export type T08 = [string, number];", errors: [{ messageId: "notReadonly" }] },
    { code: "export type T11 = { a: string };", errors: [{ messageId: "notReadonly" }] },
    { code: "export interface T18 { a: string }", errors: [{ messageId: "notReadonly" }] },
    { code: "export type T21 = { readonly a: string } & { b: number };", errors: [{ messageId: "notReadonly" }] },
  ],
});
