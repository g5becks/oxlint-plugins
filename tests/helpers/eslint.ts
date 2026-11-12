/**
 * The ESLint used by the compatibility suites. Defaults to the `eslint` devDependency (9.x);
 * set `ESLINT_PACKAGE=eslint-10` to run the same suites on ESLint 10 (exact npm alias
 * devDependency `eslint-10` -> `npm:eslint@10.x`).
 */
import { describe, it } from "bun:test";
import type * as ESLintModule from "eslint";

const pkg = process.env.ESLINT_PACKAGE ?? "eslint";
const mod: typeof ESLintModule = await import(pkg);

export const { Linter, RuleTester } = mod;
// ESLint's RuleTester looks for describe/it globals when it loads; with a dynamic import that can
// miss Bun's test globals and run cases inline. Register every case as its own bun:test test.
RuleTester.describe = describe;
RuleTester.it = it;
// No itOnly: Bun refuses even a reference to `it.only` when CI=true.
export const ESLINT_VERSION: string = (mod as { Linter: { version: string } }).Linter.version;
