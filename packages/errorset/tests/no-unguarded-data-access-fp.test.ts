import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// False positives reported by agentx on 0.2.1 (agentx TASK-309.05), and the true positives
// that must stay reported.
const rule = ruleOf(plugin, "no-unguarded-data-access");
const tester = ruleTester("ts");
const SETS = `import { errorSet, isErr } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "cancelled"]).init();
type UserError = typeof UserError.Type;
const OrderError = errorSet("OrderError", ["rejected"]).init();
declare function getUser(): any;
declare function log(...args: unknown[]): void;`;
const err = (prop = "data", name = "r") => ({ messageId: "unguardedAccess", data: { prop, name } });

tester.run("no-unguarded-data-access false positives (0.2.2)", rule, {
  valid: [
    // (b) `instanceof Error` guard clause: a native Error has `.message` and `.cause`.
    {
      code: `${SETS}
export function f(e: unknown) { if (isErr(e)) return e.kind; if (!(e instanceof Error)) return; log(e.message); }`,
    },
    // instanceof narrows in an if block and in a ternary.
    {
      code: `${SETS}\nexport function f(e: unknown) { if (isErr(e)) return; if (e instanceof Error) { log(e.message); } }`,
    },
    {
      code: `${SETS}\nexport function f(e: unknown) { if (isErr(e)) return; return e instanceof TypeError ? e.cause : 0; }`,
    },
    // instanceof with a set guard (Symbol.hasInstance) narrows like the call form.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (r instanceof UserError) { return r.data; } return 0; }`,
    },
    // (c) `instanceof Error || isErr(e)`: either way the value has `.message`.
    {
      code: `${SETS}\nexport function f(e: unknown) { const m = e instanceof Error || isErr(e) ? e.message : String(e); return m; }`,
    },
    // (d) `||` of two set guards narrows to either set.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r) || OrderError(r)) { log(r.message); } }`,
    },
    {
      code: `${SETS}\nexport function f() { const r = getUser(); return UserError(r) || OrderError(r) ? r.kind : null; }`,
    },
    // `!(A || B)` guard clause narrows the rest of the block.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (!(UserError(r) || OrderError(r))) return 0; return r.message; }`,
    },
    // (e) a parameter typed as an error set is always an error, whatever a kind guard says.
    {
      code: `${SETS}\nexport const onErr = (e: UserError) => { if (UserError.cancelled(e)) return; log(e.message); };`,
    },
    {
      code: `${SETS}\nexport function g(e: UserError) { if (UserError.not_found(e)) { return e.data; } return e.kind; }`,
    },
    // Also a variable declared with the set type, and a union of set types.
    { code: `${SETS}\nexport function h(e: UserError | OrderError) { if (UserError(e)) return 1; return e.message; }` },
  ],
  invalid: [
    // (a) Kept on purpose: after `if (G(r)) return`, `r` is the success value, and an
    // errorset property on it is the "wrong branch" case (see the rule docs).
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r)) return r; return r.data; }`,
      errors: [err()],
    },
    // instanceof of another variable doesn't narrow `r`.
    {
      code: `${SETS}\nexport function f(x: unknown) { const r = getUser(); if (UserError(r)) log(); if (x instanceof Error) { return r.data; } return 0; }`,
      errors: [err()],
    },
    // `||` narrows only when both sides narrow.
    {
      code: `${SETS}\nexport function f(ok: boolean) { const r = getUser(); if (UserError(r) || ok) { return r.data; } return 0; }`,
      errors: [err()],
    },
    // `!(A || B)` positive branch is the non-error side.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (!(UserError(r) || OrderError(r))) { return r.message; } return 0; }`,
      errors: [err("message")],
    },
    // A parameter typed with something other than an error set is not exempt.
    {
      code: `${SETS}\nexport function f(e: UserError | string) { if (UserError(e)) log(); return e.message; }`,
      errors: [err("message", "e")],
    },
    // Unguarded access with no narrowing at all, after a guarded block.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r) || OrderError(r)) { log(); } return r.data; }`,
      errors: [err()],
    },
    // Access before the guard.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); const d = r.data; if (r instanceof UserError) { return d; } return 0; }`,
      errors: [err()],
    },
  ],
});

// (a) opt-in: `allowOnSuccessValue` stops reporting where a guard proves the value is NOT an error.
const allow = [{ allowOnSuccessValue: true }];
tester.run("no-unguarded-data-access allowOnSuccessValue", rule, {
  valid: [
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r)) return r; return r.data; }`,
      options: allow,
    },
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (isErr(r)) throw r; log(r.data, r.message); }`,
      options: allow,
    },
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r)) { log(); } else { return r.data; } return 0; }`,
      options: allow,
    },
    {
      code: `${SETS}\nexport function f() { const r = getUser(); return UserError(r) ? 0 : r.data; }`,
      options: allow,
    },
    {
      code: `${SETS}\nexport function f() { const r = getUser(); return !UserError(r) && r.data; }`,
      options: allow,
    },
    {
      code: `${SETS}\nexport function f() { const r = getUser(); return UserError(r) || r.data; }`,
      options: allow,
    },
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r) || OrderError(r)) return r; return r.data; }`,
      options: allow,
    },
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (!UserError(r) && r.data) return r.data; return 0; }`,
      options: allow,
    },
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (r.set === "UserError") return r; return r.data; }`,
      options: allow,
    },
    // Narrowed accesses stay valid with the option on.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r)) { return r.data; } return 0; }`,
      options: allow,
    },
  ],
  invalid: [
    // Still reported: no guard proves anything here.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r)) log(); return r.data; }`,
      options: allow,
      errors: [err()],
    },
    // A guard clause that doesn't exit doesn't prove the value is a success.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r)) { log(); } return r.data; }`,
      options: allow,
      errors: [err()],
    },
    // After `if (A(r) && ok) return`, `r` may still be an error (when `ok` was false).
    {
      code: `${SETS}\nexport function f(ok: boolean) { const r = getUser(); if (UserError(r) && ok) return r; return r.data; }`,
      options: allow,
      errors: [err()],
    },
    // A failed `instanceof Error` doesn't rule out an error-set error.
    {
      code: `${SETS}\nexport function f(e: unknown) { if (isErr(e)) log(); if (e instanceof Error) return; return e.data; }`,
      options: allow,
      errors: [err("data", "e")],
    },
    // Off by default.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (isErr(r)) throw r; return r.data; }`,
      errors: [err()],
    },
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r)) return r; return r.data; }`,
      options: [{ allowOnSuccessValue: false }],
      errors: [err()],
    },
  ],
});
