---
id: TASK-015
title: 'errorset/no-catch-errorset: Report only guards on the caught value (OX-17, R5)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [ ] #2 A guard on a returned value inside catch is not reported; guards on the catch parameter and on a variable assigned from it are reported (tests)
- [ ] #3 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
