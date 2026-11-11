---
id: TASK-014
title: >-
  errorset/prefer-guard-over-manual-kind-check: Use the narrowing guard's set
  (OX-16, R4)
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [ ] #2 A multi-set test suggests UserError.not_found(r) for a variable narrowed by UserError; an unknown narrowing guard gives no suggestion
- [ ] #3 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
