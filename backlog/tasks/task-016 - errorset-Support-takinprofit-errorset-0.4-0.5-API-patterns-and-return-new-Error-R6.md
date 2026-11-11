---
id: TASK-016
title: >-
  errorset: Support @takinprofit/errorset 0.4/0.5 API patterns and return new
  Error (R6)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T20:52:00Z'
labels:
  - errorset
milestone: m-1
dependencies:
  - TASK-015
documentation:
  - oxlint-plugins-audit.md
priority: high
type: feature
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
New since the audit. `@takinprofit/errorset` 0.4.0 and 0.5.0 (released 2026-11-11) changed the API these rules recognize, and agentx will move to them in the later migration epic:
- 0.4: no-context errors are plain objects with `.with({ cause })` (``throw X.kind`msg`.with({ cause })``); errors carry `set`; top-level `merge`, `recover`, `inspect`, `captureSync`, `captureAsync`, `isErr`.
- 0.5: object-form sets `errorSet(name, { kind: [keys] }).init<T>()`; merged guards from `merge(A, B)` and `A.merge(B, ...)` are set-level guards with `recover`/`inspect` but no kind guards, and narrow by `err.set`; `X.from(value)` returns an error or `undefined`; `toError(err)` returns a real `Error` (the sanctioned adapter for APIs that need a thrown Error).
- Audit R6: `no-new-error-in-errorset-fn` only matches `throw new Error`, not `return new Error`.

## Implementation
1. Add `@takinprofit/errorset` 0.5.0 as an exact devDependency. Read its README and LLMS.txt for the canonical patterns. Write fixtures against the real API and type-check them as part of the tests, so fixtures can't drift from the library.
2. Detection: object-form sets; merged guards (both forms) as set-level guards; `isErr` as a guard.
3. `no-throw-errorset`: also report ``throw X.kind`...`.with(...)``; don't report `throw toError(...)` (document why).
4. `no-unguarded-data-access`: merged guards and `err.set === "Name"` comparisons narrow.
5. `prefer-guard-over-manual-kind-check`: for a merged guard, suggest the original set's kind guard only when the set is known from an `err.set` check; otherwise no suggestion.
6. `no-new-error-in-errorset-fn`: also report `return new Error(...)`.
7. Keep 0.3-era patterns working (callable no-context errors such as ``X.kind`msg`({ cause })``).
8. README: supported errorset versions and a pattern table.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Fixtures for each 0.4/0.5 pattern type-check against @takinprofit/errorset 0.5.0 as part of the test run
- [x] #2 Each rule's behavior on each pattern is tested (pattern x rule table in the notes), including .with(), merged guards, err.set narrowing, object-form sets, isErr and toError
- [x] #3 no-new-error-in-errorset-fn reports return new Error; 0.3-era callable no-context patterns still work
- [x] #4 The README lists supported errorset versions and patterns
- [x] #5 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [x] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. @takinprofit/errorset 0.5.0 exact devDependency; read README (npm) for canonical 0.4/0.5 API.
2. Tracker: set names from errorSet("Name"), merged guards (merge(A,B) imported, A.merge(B)), more errorset exports (merge, toError, captureSync/Async, recover, inspect) from configured modules.
3. Helpers: set members are never kind guards; merged guards have no kind guards; .with() creation.
4. Narrowing: r.set === "Name" (and !==); && prefers the later operand; guardSetName via tracker (set checks map to the set's guard).
5. Rules: no-throw (.with, captureSync/Async targets), no-new-error (return new Error, helper capture exemption), prefer-guard (merged -> no suggestion; set check -> suggestion), no-catch (merged guards).
6. Type-checked fixtures (packages/errorset/tests/patterns, checked by bun run check) + CLI pattern suite; RuleTester cases for suggestions/edge cases; README; changeset.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- devDependency `@takinprofit/errorset` 0.5.0 (exact). The npm tarball has no LLMS.txt; patterns taken from its README and dist/*.d.ts (exports: errorSet, merge, isErr, toError, captureSync, captureAsync, recover, inspect, RESERVED_KINDS, ...).
- Fixtures: packages/errorset/tests/patterns/{object-form,with-cause,merged,is-err,to-error,capture}.ts are real modules importing @takinprofit/errorset 0.5.0; the errorset tsconfig includes tests/**, so `bun run check` (TS 7.0.2) type-checks them on every gate/CI run (AC #1). Bad patterns use `any` values so they type-check. `// report: <rule>[, <rule>]` markers drive tests/cli/errorset-patterns.cli.test.ts (6 fixtures x 5 rules + an inventory test = 31 tests).
- Run against the pre-change rules (temp worktree of HEAD 4c8b39d + these fixtures): 5 of 31 failed (merged.ts: no-catch-errorset, prefer-guard, no-unguarded-data-access; object-form.ts: no-new-error-in-errorset-fn (return new Error); with-cause.ts: no-throw-errorset (.with)). After: 31/31 on oxlint 1.93.0 and 1.70.0.
- packages/errorset/tests/errorset-0.5-patterns.test.ts (RuleTester): .with() suggestion output, 0.3 callable `X.kind`msg`({ cause })`, toError, captureSync exemption, return new Error (+ allowedBuiltins, + non-errorset fn), merged guards and err.set in prefer-guard (incl. a set named "billing/PaymentError" bound to `PayErr`, unknown set names, isErr), no-unguarded with merged guards / set checks / from() / recover(), no-catch with merged guards and from(). errorset unit 138/138 on 1.93.0 and 1.70.0.

## Pattern x rule table (T = tested; behavior)
| Pattern | no-throw | no-catch | no-new-error | prefer-guard | no-unguarded |
|---|---|---|---|---|---|
| object-form set | T report throw (fixture) | - | T return new Error reported (fixture) | T suggestion via set guard (fixture) | T narrowing via kind/set guard (fixture) |
| `.with({ cause })` | T reported + exact suggestion (unit, fixture incl. callback: no suggestion) | - | T marks errorset fn (unit, fixture) | - | - |
| 0.3 callable `X.k`m`({ cause })` | T reported + suggestion (unit) | - | existing tests | - | - |
| merged guard `merge(A,B)` / `A.merge(B)` | - | T guard on caught value reported (unit, fixture) | - | T no suggestion (unit, fixture) | T narrows; unguarded access reported (unit, fixture) |
| `err.set === "X"` / `!==` | - | - | - | T suggests X.<kind> (unit, fixture), unknown set: none | T narrows both ways (unit, fixture) |
| `isErr` | - | T reported on caught value (fixture) | - | T no suggestion (unit) | T narrows (fixture) |
| `toError(err)` | T `throw toError(r)` not reported (unit, fixture) | - | T not reported (fixture) | - | - |
| `X.from` / `X.recover` / `X.inspect` | - | T from(e) not a guard (unit) | - | - | T arguments not tracked (unit, fixture) |
| `captureSync` / `captureAsync` (top-level) | T throw inside target not reported (unit) | - | T exempt (unit, fixture) | - | - |
| `return new Error` (R6) | - | - | T reported (unit, fixture) | - | - |

## Decisions
- Merged guards never get kind suggestions; a suggestion only comes from a set-level/kind guard of a single set or from an `err.set === "Name"` check whose name maps to a known guard (same-file `errorSet("Name")` or an import named `Name`).
- In `A && B`, B is now checked first (later = more specific narrowing).
- Set members per errorset RESERVED_KINDS (recover, inspect, merge, capture, captureAsync, kinds, Type, from) are never kind guards; this also fixes `X.from(body)` marking `body` as guarded.
- `throw toError(err)` is deliberately not reported (sanctioned adapter); documented.
- New message `noReturnNewError` for the return case.

## Verification
- `bun run gate` exit 0: check (fixtures type-check), lint (+ state check 30/0), unit 225/0, compat 34/0, repo 18/0, CLI 156/0, bench 4/0.
- README: "Supported errorset versions and patterns" table, requirement line, no-new-error text. Changeset .changeset/errorset-0.5-patterns.md (errorset minor).

Consumer-visible change: yes.

Verified with scripts/ci-local.sh (9314f14, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
errorset rules support @takinprofit/errorset 0.4/0.5 (.with, object-form sets, merged guards, err.set narrowing, capture helpers, toError) with 0.3 patterns intact; set members are no longer kind guards; return new Error is reported. Fixtures type-check against 0.5.0; pattern x rule table in notes. Changeset: errorset minor. Verified with scripts/ci-local.sh (9314f14, PASS).
<!-- SECTION:FINAL_SUMMARY:END -->
