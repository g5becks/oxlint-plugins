---
id: TASK-026
title: 'Testing: Fix-safety and option-schema suites (OX-24, R16)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - testing
milestone: m-2
dependencies:
  - TASK-025
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit T5 and R16. Fixes are applied automatically by `oxlint --fix` in consumers' hooks, and oxlint aborts the whole run when options fail schema validation, so fix output and schemas are public behavior.

## Implementation
1. Fix safety: for every rule with a fix, apply `oxlint --fix` to fixtures and check that the output parses and type-checks (tsc), and for value-level fixes that behavior is preserved where testable.
2. Schemas: for every rule with options, valid option sets load and invalid ones fail with "Options validation failed" in real oxlint (1.70.0 and pinned). Tighten or loosen schemas where tests show they're wrong.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every fixable rule has a fix-safety test whose fixed output type-checks
- [ ] #2 Every rule with options has valid and invalid schema tests in real oxlint 1.70.0 and pinned
- [ ] #3 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
