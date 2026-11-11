import { ruleOf, ruleTester } from "../../../tests/helpers/rule-tester.ts";
import plugin from "../src/index.ts";

// @takinprofit/errorset 0.4 / 0.5 patterns (and 0.3-era ones that must keep working).
// The type-checked fixtures in tests/patterns are linted by tests/cli/errorset-patterns.cli.test.ts;
// these cases pin suggestions and edge cases.
const tester = ruleTester("ts");
const SETS = `import { errorSet, merge, isErr, toError, captureSync } from "@takinprofit/errorset";
const UserError = errorSet("UserError", ["not_found", "invalid"]).init();
const DbError = errorSet("DbError", ["timeout"]).init();
const PayErr = errorSet("billing/PaymentError", { declined: ["id"] }).init();
const ServiceError = merge(UserError, DbError);
const ServiceError2 = UserError.merge(DbError);
declare function get(): any;`;

tester.run("no-throw-errorset: 0.4 .with() and 0.3 callable forms", ruleOf(plugin, "no-throw-errorset"), {
  valid: [
    // toError(err) is the sanctioned way to throw a real Error.
    { code: `${SETS}\nexport function f() { const r = get(); if (UserError(r)) throw toError(r); return r; }` },
    // Returning `.with()` errors is the intended use.
    { code: `${SETS}\nexport function f(e: unknown) { return UserError.invalid\`bad\`.with({ cause: e }); }` },
    // Throwing inside a top-level captureSync() target is the point of capture.
    {
      code: `${SETS}\nexport const r = captureSync(() => { throw UserError.invalid\`bad\`; }, (e) => UserError.invalid\`x\`.with({ cause: e }));`,
    },
  ],
  invalid: [
    {
      code: `${SETS}\nexport function f(e: unknown) { throw UserError.invalid\`bad\`.with({ cause: e }); }`,
      output: null,
      errors: [
        {
          messageId: "noThrow",
          suggestions: [
            {
              messageId: "suggestReturn",
              output: `${SETS}\nexport function f(e: unknown) { return UserError.invalid\`bad\`.with({ cause: e }); }`,
            },
          ],
        },
      ],
    },
    // 0.3-era callable no-context error with a cause.
    {
      code: `${SETS}\nexport function f(e: unknown) { throw UserError.invalid\`bad\`({ cause: e }); }`,
      output: null,
      errors: [
        {
          messageId: "noThrow",
          suggestions: [
            {
              messageId: "suggestReturn",
              output: `${SETS}\nexport function f(e: unknown) { return UserError.invalid\`bad\`({ cause: e }); }`,
            },
          ],
        },
      ],
    },
  ],
});

tester.run("no-new-error-in-errorset-fn: return new Error (audit R6)", ruleOf(plugin, "no-new-error-in-errorset-fn"), {
  valid: [
    // A function that never creates errorset values may return Errors.
    { code: `${SETS}\nexport function f() { return new Error("x"); }` },
    // allowedBuiltins applies to returns too.
    {
      code: `${SETS}\nexport function f(id: string) { if (!id) return new TypeError("x"); return UserError.invalid\`bad\`; }`,
      options: [{ allowedBuiltins: ["TypeError"] }],
    },
    // Throwing inside a top-level captureSync() target is exempt.
    {
      code: `${SETS}\nexport function f() { return captureSync(() => { throw new Error("io"); }, (e) => UserError.invalid\`bad\`.with({ cause: e })); }`,
    },
  ],
  invalid: [
    {
      code: `${SETS}\nexport function f(id: string) { if (!id) return new Error("x"); return UserError.invalid\`bad\`; }`,
      errors: [{ messageId: "noReturnNewError", data: { name: "Error" } }],
    },
    // `.with()` creation marks the function as an errorset function.
    {
      code: `${SETS}\nexport function f(id: string) { if (!id) throw new RangeError("x"); return UserError.invalid\`bad\`.with({ cause: id }); }`,
      errors: [{ messageId: "noNewError", data: { name: "RangeError" } }],
    },
  ],
});

const preferGuard = ruleOf(plugin, "prefer-guard-over-manual-kind-check");
const suggest = (before: string, after: string) => ({
  code: `${SETS}\n${before}`,
  output: null,
  errors: [{ messageId: "preferGuard", suggestions: [{ messageId: "preferGuard", output: `${SETS}\n${after}` }] }],
});
tester.run("prefer-guard-over-manual-kind-check: merged guards and err.set", preferGuard, {
  valid: [],
  invalid: [
    // Merged guards have no kind guards: no suggestion.
    {
      code: `${SETS}\nconst r = get();\nif (ServiceError(r)) { if (r.kind === "timeout") {} }`,
      output: null,
      errors: [{ messageId: "preferGuardUnknown", suggestions: [] }],
    },
    {
      code: `${SETS}\nconst r = get();\nif (ServiceError2(r)) { if (r.kind === "timeout") {} }`,
      output: null,
      errors: [{ messageId: "preferGuardUnknown", suggestions: [] }],
    },
    // The set is known from an err.set check: suggest that set's kind guard.
    suggest(
      'const r = get();\nif (ServiceError(r) && r.set === "DbError") { if (r.kind === "timeout") {} }',
      'const r = get();\nif (ServiceError(r) && r.set === "DbError") { if (DbError.timeout(r)) {} }',
    ),
    suggest(
      'const r = get();\nif (ServiceError(r)) { if (r.set === "UserError") { if (r.kind === "invalid") {} } }',
      'const r = get();\nif (ServiceError(r)) { if (r.set === "UserError") { if (UserError.invalid(r)) {} } }',
    ),
    // The set name differs from the variable: mapped through errorSet("billing/PaymentError").
    suggest(
      'const r = get();\nif (r.set === "billing/PaymentError" && r.kind === "declined") {}',
      'const r = get();\nif (r.set === "billing/PaymentError" && PayErr.declined(r)) {}',
    ),
    // isErr still gives no suggestion.
    {
      code: `${SETS}\nconst r = get();\nif (isErr(r) && r.kind === "timeout") {}`,
      output: null,
      errors: [{ messageId: "preferGuardUnknown", suggestions: [] }],
    },
    // An unknown set name: no suggestion.
    {
      code: `${SETS}\nconst r = get();\nif (r.set === "OtherError" && r.kind === "x") {}`,
      output: null,
      errors: [{ messageId: "preferGuardUnknown", suggestions: [] }],
    },
  ],
});

tester.run("no-unguarded-data-access: merged guards, err.set, from()", ruleOf(plugin, "no-unguarded-data-access"), {
  valid: [
    { code: `${SETS}\nexport function f() { const r = get(); if (ServiceError(r)) { return r.data; } return 0; }` },
    { code: `${SETS}\nexport function f() { const r = get(); if (ServiceError2(r)) { return r.data; } return 0; }` },
    {
      code: `${SETS}\nexport function f() { const r = get(); UserError(r); return r.set === "UserError" ? r.data : 0; }`,
    },
    {
      code: `${SETS}\nexport function f() { const r = get(); if (UserError(r)) { return 1; } if (r.set !== "UserError") return 0; return r.data; }`,
    },
    // from() / recover() are set members, not guards: their arguments are not tracked.
    { code: `${SETS}\nexport function f(body: any) { const e = UserError.from(body); return body.data ?? e; }` },
    { code: `${SETS}\nexport function f(r: any) { UserError.recover(r, { _: () => 0 }); return r.data; }` },
  ],
  invalid: [
    {
      code: `${SETS}\nexport function f() { const r = get(); if (ServiceError(r)) { log(); } return r.data; }`,
      errors: [{ messageId: "unguardedAccess" }],
    },
    {
      code: `${SETS}\nexport function f() { const r = get(); UserError(r); return r.set === "UserError" ? 0 : r.data; }`,
      errors: [{ messageId: "unguardedAccess" }],
    },
  ],
});

tester.run("no-catch-errorset: merged guards", ruleOf(plugin, "no-catch-errorset"), {
  valid: [
    // from() on the caught value is a parser, not a guard.
    { code: `${SETS}\nexport function f() { try { get(); } catch (e) { return UserError.from(e); } }` },
  ],
  invalid: [
    {
      code: `${SETS}\nexport function f() { try { get(); } catch (e) { if (ServiceError(e)) return 1; } }`,
      errors: [{ messageId: "guardInCatch" }],
    },
    {
      code: `${SETS}\nexport function f() { try { get(); } catch (e) { if (ServiceError2(e)) return 1; } }`,
      errors: [{ messageId: "guardInCatch" }],
    },
  ],
});
