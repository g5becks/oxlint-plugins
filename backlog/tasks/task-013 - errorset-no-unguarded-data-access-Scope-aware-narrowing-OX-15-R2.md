---
id: TASK-013
title: 'errorset/no-unguarded-data-access: Scope-aware narrowing (OX-15, R2)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - errorset
  - bug
milestone: m-1
dependencies:
  - TASK-012
documentation:
  - oxlint-plugins-audit.md
priority: high
type: bug
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R2 (High). `no-unguarded-data-access` tracks guarded variables per file by name (`guardedVarNames: Set<string>`), only treats `if` consequents as guarded (`isInsideGuardBlock`), and fills the set during traversal, so an access before the first guard is never reported. Four of five idiomatic probes were false positives: a guard clause, a same-named variable in another function, a ternary.

## Implementation
1. Resolve variables with `sourceCode.getScope(node)` and track per `Variable`, not per name. Confirm the scope API exists on oxlint 1.70.0.
2. Model narrowing for `if`/`else`, negated guards with an early exit (`return`, `throw`, `continue`, `break`), conditional expressions, `&&` chains, and `!G(r) || r.data`.
3. Make results independent of traversal order (resolve at `Program:exit`, or two passes).
4. Universal `isErr` from a configured module also narrows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [ ] #2 The 5-case probe gives 5 of 5 expected results, including the same-name variable in another function
- [ ] #3 Each narrowing form (if/else, negated guard with early exit, ternary, &&, ||) has a positive and a negative test; an access before the first guard is reported
- [ ] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
