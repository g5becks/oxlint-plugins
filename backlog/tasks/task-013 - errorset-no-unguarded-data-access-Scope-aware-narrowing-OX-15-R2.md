---
id: TASK-013
title: 'errorset/no-unguarded-data-access: Scope-aware narrowing (OX-15, R2)'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T20:23:00Z'
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
- [x] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [x] #2 The 5-case probe gives 5 of 5 expected results, including the same-name variable in another function
- [x] #3 Each narrowing form (if/else, negated guard with early exit, ternary, &&, ||) has a positive and a negative test; an access before the first guard is reported
- [x] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Commit the Appendix A probes + per-form positive/negative tests first (new RuleTester file); record failures.
2. Rewrite: collect guard calls and accesses, evaluate at Program:exit; resolve identifiers via sourceCode.getScope + scope chain (Variable identity); narrowing walk for if/else, ternary, &&, ||, guard clauses with early exit.
3. Verify scope API on 1.70.0 (RuleTester + CLI); README; changeset.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Failing first
packages/errorset/tests/no-unguarded-data-access-narrowing.test.ts (14 valid, 9 invalid): Appendix A probes (guard clause, same name in another function, ternary, if consequent, access with no narrowing) plus a positive and a negative case for every narrowing form, an access before the first guard, and same-named variables across functions. On the old rule: 14 of 23 FAILED (errorset unit 89 tests, 75 pass).

## Implementation
- Per file the rule collects CallExpressions with an Identifier first argument and non-computed `x.prop` MemberExpressions; at Program:exit (after imports/guards are known) it builds the set of guarded Variables and reports tracked-property accesses whose Variable is guarded and not narrowed. Order-independent; state reset in before() (state check: 30 declarations, 0 not reset).
- Variable identity: `context.sourceCode.getScope(identifier)` then walk `scope.set` up the chain; unresolved globals keyed by name.
- Narrowing (ancestor walk from the access): IfStatement/ConditionalExpression consequent under a positive test, alternate under a negative test; LogicalExpression right side under `G && ...` or `!G || ...`; guard clauses: an earlier sibling `if (negative) <exit>` without `else` in a block/Program/SwitchCase, exit = return/throw/continue/break or a block ending in one. Positive = guard/kind-guard/isErr call on the variable, or an `&&` containing one; negative = `!positive` or `||` of negatives. Narrowing reaches callbacks inside the narrowed region. `isErr` from a configured module (TASK-012) narrows via the tracker.

## Results
- 5-case Appendix A probe: 5 of 5 expected (4 valid incl. the same-name variable in another function, 1 invalid).
- errorset unit 89/89; full unit 176/0 on the pinned RuleTester AND with OXLINT_RULE_TESTER = oxlint 1.70.0 (scope API confirmed on the floor); CLI errorset 14/0 on 1.93.0 and on OXLINT_BIN=1.70.0.
- README: narrowing table and examples. Changeset .changeset/errorset-unguarded-narrowing.md (errorset patch: false positives fixed, order-dependent false negative fixed).
- `bun run gate` exit 0: unit 176/0, compat 34/0, repo 18/0, CLI 125/0, bench 4/0.

Consumer-visible change: yes.
<!-- SECTION:NOTES:END -->
