import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// Audit R2: scope-aware narrowing for no-unguarded-data-access.
const rule = ruleOf(plugin, "no-unguarded-data-access");
const tester = ruleTester("ts");
const SETS = `import { errorSet, isErr } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found"]).init();
declare function getUser(): any;
declare function fetchJson(): Promise<any>;`;
const err = (prop = "data", name = "r") => ({ messageId: "unguardedAccess", data: { prop, name } });

tester.run("no-unguarded-data-access narrowing (audit R2)", rule, {
  valid: [
    // Appendix A probe 1: guard clause with early return.
    { code: `${SETS}\nexport function f() { const r = getUser(); if (!UserError(r)) return r.id; return r.data.id; }` },
    // Appendix A probe 2: same name in another function that never touches errorset.
    {
      code: `${SETS}
export function a() { const r = getUser(); if (UserError(r)) { return r.data.id; } return 0; }
export async function b() { const r = await fetchJson(); return r.data.length; }`,
    },
    // Appendix A probe 3: ternary.
    { code: `${SETS}\nexport function f() { const r = getUser(); return UserError(r) ? r.data.id : r.id; }` },
    // Appendix A probe 4: if consequent.
    { code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r)) { return r.data.id; } return 0; }` },
    // Negated guard with early exit: throw / continue / break, braces.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (!isErr(r)) { throw new TypeError("x"); } return r.kind; }`,
    },
    {
      code: `${SETS}\nexport function f(rs: any[]) { for (const r of rs) { if (!UserError(r)) continue; console.log(r.data); } }`,
    },
    {
      code: `${SETS}\nexport function f(rs: any[]) { for (const r of rs) { if (!UserError(r)) break; console.log(r.data); } }`,
    },
    // else branch of a negated guard.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (!UserError(r)) { return 0; } else { return r.data; } }`,
    },
    // Ternary alternate of a negated guard.
    { code: `${SETS}\nexport function f() { const r = getUser(); return !UserError(r) ? 0 : r.data; }` },
    // && chain, also nested in a larger condition.
    { code: `${SETS}\nexport function f() { const r = getUser(); return UserError(r) && r.data.id; }` },
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (isErr(r) && r.kind === "not_found") { return 1; } return 0; }`,
    },
    // !G(r) || r.data
    { code: `${SETS}\nexport function f() { const r = getUser(); return !UserError(r) || r.data.id; }` },
    // Kind-level guard narrows.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError.not_found(r)) { return r.message; } return ""; }`,
    },
    // Narrowing reaches callbacks inside the narrowed branch.
    {
      code: `${SETS}\nexport function f(xs: number[]) { const r = getUser(); if (UserError(r)) { return xs.map(() => r.data); } return []; }`,
    },
  ],
  invalid: [
    // Appendix A probe 5: access with no narrowing, after a guarded block.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r)) { log(); } return r.data; }`,
      errors: [err()],
    },
    // Access BEFORE the first guard call is reported (no order dependency).
    {
      code: `${SETS}\nexport function f() { const r = getUser(); const d = r.data; if (UserError(r)) { return d; } return 0; }`,
      errors: [err()],
    },
    // Guard clause without an early exit does not narrow.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (!UserError(r)) { log(); } return r.data; }`,
      errors: [err()],
    },
    // Positive branch of a negated guard is not narrowed.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (!UserError(r)) { return r.data; } return 0; }`,
      errors: [err()],
    },
    // else branch of a positive guard is not narrowed.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r)) { return 0; } else { return r.data; } }`,
      errors: [err()],
    },
    // Ternary: wrong branch.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); return UserError(r) ? 0 : r.data; }`,
      errors: [err()],
    },
    // &&: access on the left of the guard.
    { code: `${SETS}\nexport function f() { const r = getUser(); return r.data && UserError(r); }`, errors: [err()] },
    // ||: positive guard on the left does not narrow the right.
    { code: `${SETS}\nexport function f() { const r = getUser(); return UserError(r) || r.data; }`, errors: [err()] },
    // Guard on a different variable with the same name in another scope does not narrow.
    {
      code: `${SETS}\nexport function f() { const r = getUser(); if (UserError(r)) { return 1; } return 0; }\nexport function g() { const r = getUser(); UserError(r); return r.data; }`,
      errors: [err()],
    },
  ],
});
