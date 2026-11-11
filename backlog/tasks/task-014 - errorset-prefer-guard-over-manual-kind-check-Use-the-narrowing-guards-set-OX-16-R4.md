---
id: TASK-014
title: >-
  errorset/prefer-guard-over-manual-kind-check: Use the narrowing guard's set
  (OX-16, R4)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T20:36:00Z'
labels:
  - errorset
  - bug
milestone: m-1
dependencies:
  - TASK-013
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: bug
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R4. With `OrderError` and `UserError` in scope, `if (UserError(r)) { if (r.kind === "not_found") ... }` is told to use `OrderError.not_found(r)`: the rule takes the first guard declared in the file. Applying that suggestion breaks the code.

## Implementation
Take the set from the guard call that narrowed the variable (reuse the narrowing from the previous task). If the narrowing guard is unknown, report without a suggestion.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [x] #2 A multi-set test suggests UserError.not_found(r) for a variable narrowed by UserError; an unknown narrowing guard gives no suggestion
- [x] #3 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Failing tests first: multi-set probe file (Appendix A + per-form narrowing + isErr unknown) and the existing isErr case updated to expect no suggestion.
2. Extract TASK-013 narrowing into utils/narrowing.ts returning the narrowing guard call; no-unguarded-data-access uses it.
3. prefer-guard: suggestion uses guardSetName(narrowing call); isErr -> preferGuardUnknown without suggestion.
4. README, changeset.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Failing first
- New packages/errorset/tests/prefer-guard-multi-set.test.ts (OrderError declared before UserError): Appendix A probe `if (UserError(r)) { if (r.kind === "not_found") }` must suggest `UserError.not_found(r)`; also ternary on the second set, && chain, kind-guard narrowing, guard clause, and `isErr(r)` -> preferGuardUnknown with `suggestions: []`; valid: un-narrowed check, same-named variable in another function.
- Existing case "isErr(result) { result.kind === ... }" changed from expecting the first-set suggestion `UserError.not_found(result)` to `preferGuardUnknown` with no suggestion: that expectation encoded the R4 bug (first guard in file). Before the fix: 5 failures (errorset unit 97 tests, 92 pass).

## Implementation
- packages/errorset/src/utils/narrowing.ts: `createNarrowing(context, tracker)` -> `resolve`, `isGuardLike`, `narrowingCall(node, key)` (the guard call that narrows, or null) with the TASK-013 forms; `guardSetName(call, guardNames)` (set of `UserError(r)` / `UserError.kind(r)`, null for isErr). Built per file / per node, so no createOnce closure state (state check 30 declarations, 0 not reset).
- no-unguarded-data-access now uses it (its 89 + 23 cases unchanged and passing).
- prefer-guard: reports only when narrowed; suggestion uses the narrowing guard's set; unknown (isErr) -> preferGuardUnknown without a suggestion.
- One more existing case (reversed `"not_found" === result.kind` under isErr) also encoded the first-set guess; to keep its purpose (reversed comparison with a suggestion) it now narrows with `UserError(result)` and keeps the same suggestion output.

## Verification
- errorset unit 97/97; `bun run gate` exit 0: unit 184/0, compat 34/0, repo 18/0, CLI 125/0, bench 4/0.
- README updated; changeset .changeset/errorset-prefer-guard-set.md (errorset patch).

Consumer-visible change: yes (correct suggestion; isErr no longer gets a guessed suggestion).

Verified with scripts/ci-local.sh (7ca1b1c, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
prefer-guard-over-manual-kind-check suggests the set of the guard that narrowed the value (multi-set probe passes); isErr narrowing gets no suggestion; narrowing shared with no-unguarded-data-access via utils/narrowing.ts. Changeset: errorset patch. Verified with scripts/ci-local.sh (7ca1b1c, PASS).
<!-- SECTION:FINAL_SUMMARY:END -->
