---
id: TASK-011
title: >-
  errorset/no-throw-errorset: Replace the autofix with a scoped suggestion
  (OX-13, R3)
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [ ] #2 meta.fixable is gone and hasSuggestions is true; the suggestion appears only for throws directly in the enclosing function body (tests for callback, try/finally, loop, switch and direct cases)
- [ ] #3 A CLI test shows oxlint --fix never modifies a throw
- [ ] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
