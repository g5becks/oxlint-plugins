import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// Audit R5: only guards applied to the caught value can "never match".
const rule = ruleOf(plugin, "no-catch-errorset");
const tester = ruleTester("ts");
const SETS = `import { errorSet, isErr } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found"]).init();
declare function run(): void;
declare function fallback(): any;`;

tester.run("no-catch-errorset targets the caught value (audit R5)", rule, {
  valid: [
    // Appendix A probe: guard on a returned value inside catch.
    {
      code: `${SETS}\nexport function f() { try { run(); } catch { const r = fallback(); if (UserError(r)) return r; } return null; }`,
    },
    {
      code: `${SETS}\nexport function f() { try { run(); } catch (e) { const r = fallback(); if (isErr(r)) { return r.kind; } } }`,
    },
    {
      code: `${SETS}\nexport function f() { try { run(); } catch (e) { const r = fallback(); if (r instanceof UserError) { return r; } } }`,
    },
    // A variable derived by a call (not a direct assignment) is not the caught value.
    {
      code: `${SETS}\nexport function f() { try { run(); } catch (e) { const r = fallback(e); if (UserError(r)) return r; } }`,
    },
    // Shadowing: an inner variable named like the catch parameter.
    {
      code: `${SETS}\nexport function f() { try { run(); } catch (e) { { const e = fallback(); if (UserError(e)) return e; } } }`,
    },
  ],
  invalid: [
    // Guard on the catch parameter.
    {
      code: `${SETS}\nexport function f() { try { run(); } catch (e) { if (UserError(e)) { return 1; } } }`,
      errors: [{ messageId: "guardInCatch" }],
    },
    {
      code: `${SETS}\nexport function f() { try { run(); } catch (e) { if (isErr(e)) { return 1; } } }`,
      errors: [{ messageId: "isErrInCatch" }],
    },
    {
      code: `${SETS}\nexport function f() { try { run(); } catch (e) { if (UserError.not_found(e)) { return 1; } } }`,
      errors: [{ messageId: "guardInCatch" }],
    },
    {
      code: `${SETS}\nexport function f() { try { run(); } catch (e) { if (e instanceof UserError) { return 1; } } }`,
      errors: [{ messageId: "instanceofInCatch" }],
    },
    // Variable assigned directly from the caught value (also transitively).
    {
      code: `${SETS}\nexport function f() { try { run(); } catch (e) { const err = e; if (UserError(err)) { return 1; } } }`,
      errors: [{ messageId: "guardInCatch" }],
    },
    {
      code: `${SETS}\nexport function f() { try { run(); } catch (e) { const a = e; const b = a; if (isErr(b)) { return b.kind; } } }`,
      errors: [{ messageId: "isErrInCatch" }, { messageId: "kindInCatch" }],
    },
    // Inside a callback in the catch block, still the caught value.
    {
      code: `${SETS}\nexport function f(xs: number[]) { try { run(); } catch (e) { return xs.filter(() => UserError(e)); } }`,
      errors: [{ messageId: "guardInCatch" }],
    },
    // Destructured catch parameter: bindings are caught values.
    {
      code: `${SETS}\nexport function f() { try { run(); } catch ({ cause }) { if (UserError(cause)) { return 1; } } }`,
      errors: [{ messageId: "guardInCatch" }],
    },
  ],
});
