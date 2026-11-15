---
"oxlint-plugin-errorset": patch
---

`no-unguarded-data-access` no longer reports three kinds of guarded access (found on agentx):

- after `instanceof`: `if (!(e instanceof Error)) return; e.message`, `if (r instanceof UserError) r.data` (set guards support `instanceof`; an `instanceof` set guard also marks the variable as guarded);
- after `||` of two narrowing tests: `e instanceof Error || isErr(e) ? e.message : …`, `if (A(x) || B(x)) x.message`, and the `!(A(x) || B(x))` guard clause;
- on a variable or parameter declared with an error-set type (`(e: UserError) => { if (UserError.cancelled(e)) return; e.message }`), including unions of set types.

`prefer-guard-over-manual-kind-check` keeps its narrowing forms (an `instanceof Error` block or `A(x) || B(x)` says nothing about which kind guard to suggest). Accessing errorset properties where the value is proven not to be an error, such as `r.data` after `if (G(r)) return r`, is still reported by default. The new opt-in option `allowOnSuccessValue: true` allows those accesses, for code whose success values have their own `data` (an HTTP response body, say).
