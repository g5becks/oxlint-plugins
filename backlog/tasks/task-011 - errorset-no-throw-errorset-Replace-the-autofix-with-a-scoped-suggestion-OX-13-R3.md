---
id: TASK-011
title: >-
  errorset/no-throw-errorset: Replace the autofix with a scoped suggestion
  (OX-13, R3)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T20:14:00Z'
labels:
  - errorset
  - bug
milestone: m-1
dependencies:
  - TASK-010
documentation:
  - oxlint-plugins-audit.md
priority: high
type: bug
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R3 (Critical, latent). `no-throw-errorset` has `meta.fixable: "code"`; plain `oxlint --fix` rewrites `throw X.kind...` to `return X.kind...`. Inside `ids.map((id) => { if (!id) throw ... })` the callback then returns an error object into the array; inside `try { throw ... } finally { ... }` control flow changes. agentx runs `oxlint --fix` in pre-commit and its lint tasks. It's latent only because R1 keeps the rule silent, so this must land before R1's fix.

## Implementation
1. Commit the Appendix A R3 probe as a failing test.
2. Remove `meta.fixable`; set `hasSuggestions: true`; turn the fix into a suggestion.
3. Offer the suggestion only when the `throw` is directly in the body of the enclosing function: not inside a nested callback, `try`/`catch`/`finally`, loop or `switch`.
4. Tests: no suggestion in a `.map` callback, in `try`/`finally`, or in a loop; a suggestion with the exact output for a direct throw; a CLI test showing `--fix` never changes a `throw`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [x] #2 meta.fixable is gone and hasSuggestions is true; the suggestion appears only for throws directly in the enclosing function body (tests for callback, try/finally, loop, switch and direct cases)
- [x] #3 A CLI test shows oxlint --fix never modifies a throw
- [x] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [x] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Probe already committed as failing (c75f044, test.failing TASK-011 CLI: --fix rewrites throws in .map callback and try/finally).
2. Rewrite unit cases first (suggestion with exact output for direct throws; no suggestion for callback, try/finally, catch, for, while, switch); record failures.
3. Rule: remove meta.fixable, hasSuggestions, suggestReturn suggestion only when isDirectThrow.
4. Unmark CLI probe; add a --fix test on direct throws; README; breaking changeset.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Failing first
- Appendix A R3 probe committed in c75f044 as `test.failing("TASK-011: --fix never rewrites throw statements")` (fixture tests/cli/fixtures/errorset/unsafe-fix.ts). Verified then with real oxlint 1.93.0: `--fix` rewrote line 7 (`if (!id) throw ...` in `ids.map`) and line 14 (`throw` in `try { } finally`) to `return`.
- Unit tests rewritten before the fix: 10 invalid cases (4 direct throws expecting no autofix and an exact `suggestReturn` suggestion; .map callback, try/finally, catch, for-of, while, switch expecting `suggestions: []`) -> 10 of 10 invalid FAILED on the old rule (tests 49, pass 39).

## Fix
`meta.fixable` removed, `hasSuggestions: true`, new message `suggestReturn`. `isDirectThrow(node)`: walking up from the throw to the enclosing function only BlockStatement/IfStatement may intervene, and the function must not be an argument of a CallExpression/NewExpression (a callback). Otherwise the report carries `suggest: []`.

## After
- errorset unit 49/49 (unit total 136/0). CLI: the R3 probe is now a plain test and passes; added the same --fix check on the direct-throw fixture (no-throw-errorset.ts): reported, file unchanged. errorset CLI suite 13/0.
- README: rule marked 💡 suggestion, explains where it is (not) offered and that `oxlint --fix` never changes a throw.
- Changeset .changeset/errorset-no-throw-suggestion.md: oxlint-plugin-errorset **minor** (0.x breaking: autofix removed), with migration notes.
- `bun run gate` exit 0: lint (+ state check), unit 136/0, compat 34/0, repo 18/0, CLI 124/0, bench 4/0. Remaining test.failing marker: TASK-012 only.

Consumer-visible change: yes (breaking: autofix removed, suggestion instead).

Verified with scripts/ci-local.sh (bd273e5, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
no-throw-errorset no longer autofixes; it offers a return suggestion only for throws directly in a non-callback function body (unit tests for callback, try/finally, catch, loops, switch, direct). The R3 CLI probe passes: oxlint --fix never changes a throw. Breaking changeset (errorset minor). Verified with scripts/ci-local.sh (bd273e5, PASS).
<!-- SECTION:FINAL_SUMMARY:END -->
