---
id: TASK-015
title: 'errorset/no-catch-errorset: Report only guards on the caught value (OX-17, R5)'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T20:38:00Z'
labels:
  - errorset
  - bug
milestone: m-1
dependencies:
  - TASK-014
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: bug
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R5. `no-catch-errorset` reports any guard call inside a `CatchClause`, so `catch { const r = fallback(); if (UserError(r)) return r }` is reported as "will never match".

## Implementation
Report only when the guard's argument resolves (by scope) to the catch parameter, or to a variable assigned directly from it. Decide and record how destructured catch parameters are handled.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [x] #2 A guard on a returned value inside catch is not reported; guards on the catch parameter and on a variable assigned from it are reported (tests)
- [x] #3 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Failing tests first (Appendix A probe + caught-value cases incl. derived, transitive, callback, destructured, shadowing).
2. isCaughtValue: resolve by scope; catch param via def type CatchClause or pattern walk to CatchClause.param; direct `const x = <caught>` transitively.
3. Apply to guard calls, isErr, instanceof and .kind; README; changeset.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Failing first
packages/errorset/tests/no-catch-errorset-scope.test.ts (5 valid, 8 invalid): Appendix A probe `catch { const r = fallback(); if (UserError(r)) return r }` plus isErr/instanceof on a fallback value, call-derived value, shadowed name (valid); guard/isErr/kind-guard/instanceof on the parameter, direct and transitive assignment (+ .kind), guard inside a callback in the catch block, destructured catch parameter (invalid). Before the fix: 7 failures (errorset unit 110, 103 pass): the 5 valid cases were reported, and the callback and destructured cases were missed.

## Implementation
`isCaughtValue(context, id)`: resolve the identifier via the shared `resolveVariable` (exported from utils/narrowing.ts); caught if any def has type "CatchClause", or a declared identifier sits (through Object/Array/Assignment patterns, properties, rest) in a CatchClause param; or a declarator `const x = <Identifier>` whose init is caught (transitively, depth limit 8). Applied to guard/isErr calls (first argument), `instanceof` (left side) and `.kind` (object). The old "inside a CatchClause, stop at function boundaries" check is gone.

## Decisions
- Destructured catch parameters: every binding (`catch ({ cause })`, `catch ([first])`) is treated as a caught value, so guards on them are reported; the destructuring pattern itself is not reported as a .kind access.
- Only direct identifier assignments propagate (`const err = e`); anything computed (`fallback(e)`, `e.cause`) is not considered the caught value (conservative: fewer reports).
- Callbacks inside the catch block: guards on the caught value are now reported there too (previously exempt by the function-boundary rule); README updated.

## Verification
- errorset unit 110/110 on pinned 1.93.0 and with the 1.70.0 RuleTester.
- `bun run gate` exit 0: unit 197/0, compat 34/0, repo 18/0, CLI 125/0, bench 4/0.
- Changeset .changeset/errorset-no-catch-caught-value.md (errorset patch).

Consumer-visible change: yes.
<!-- SECTION:NOTES:END -->
