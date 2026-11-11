import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// Audit R4: with several sets in scope, the suggestion must use the set of the guard
// that narrowed the variable, not the first set declared in the file.
const rule = ruleOf(plugin, "prefer-guard-over-manual-kind-check");
const tester = ruleTester("ts");
const SETS = `import { errorSet, isErr } from "@takinprofit/errorset";
const OrderError = errorSet("OrderError", ["out_of_stock"]).init();
const UserError = errorSet("UserError", ["not_found"]).init();
declare function getUser(): any;`;
const suggest = (before: string, after: string) => ({
  code: `${SETS}\n${before}`,
  output: null,
  errors: [{ messageId: "preferGuard", suggestions: [{ messageId: "preferGuard", output: `${SETS}\n${after}` }] }],
});

tester.run("prefer-guard-over-manual-kind-check, several sets (audit R4)", rule, {
  valid: [
    // A kind check that is not narrowed by any guard is out of scope (conservative).
    { code: `${SETS}\nconst r = getUser();\nif (r.kind === "not_found") {}` },
    // A guard on a different variable with the same name in another function doesn't narrow.
    {
      code: `${SETS}\nfunction a() { const r = getUser(); return UserError(r); }\nfunction b() { const r = getUser(); if (r.kind === "x") {} }`,
    },
  ],
  invalid: [
    // Appendix A probe: narrowed by UserError -> UserError.not_found(r), not OrderError.
    suggest(
      'const r = getUser();\nif (UserError(r)) { if (r.kind === "not_found") {} }',
      "const r = getUser();\nif (UserError(r)) { if (UserError.not_found(r)) {} }",
    ),
    // Narrowed by the second set, in a ternary.
    suggest(
      'const r = getUser();\nconst x = OrderError(r) ? r.kind === "out_of_stock" : false;',
      "const r = getUser();\nconst x = OrderError(r) ? OrderError.out_of_stock(r) : false;",
    ),
    // Narrowed in the same && chain.
    suggest(
      'const r = getUser();\nif (UserError(r) && r.kind === "not_found") {}',
      "const r = getUser();\nif (UserError(r) && UserError.not_found(r)) {}",
    ),
    // Kind-level guard narrows to its set.
    suggest(
      'const r = getUser();\nif (OrderError.out_of_stock(r)) { if (r.kind === "out_of_stock") {} }',
      "const r = getUser();\nif (OrderError.out_of_stock(r)) { if (OrderError.out_of_stock(r)) {} }",
    ),
    // Guard clause narrowing.
    suggest(
      'function f() { const r = getUser(); if (!UserError(r)) return; if (r.kind === "not_found") {} }',
      "function f() { const r = getUser(); if (!UserError(r)) return; if (UserError.not_found(r)) {} }",
    ),
    // Unknown narrowing guard (isErr): reported, no suggestion.
    {
      code: `${SETS}\nconst r = getUser();\nif (isErr(r)) { if (r.kind === "not_found") {} }`,
      output: null,
      errors: [{ messageId: "preferGuardUnknown", suggestions: [] }],
    },
  ],
});
