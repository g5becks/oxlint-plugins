---
id: TASK-032
title: 'errorset: One shared import tracker per file (OX-33, R6)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - errorset
  - performance
milestone: m-3
dependencies:
  - TASK-031
documentation:
  - oxlint-plugins-audit.md
priority: low
type: chore
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R6. All five errorset rules run their own import tracker over the same file.

## Implementation
Share one tracker per file across the errorset rules (for example a WeakMap keyed by `sourceCode` or the Program node). Verify the key is the same object for every rule in both oxlint and ESLint; record the evidence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One tracker computation per file is shared by all errorset rules in oxlint and ESLint (tests prove the sharing)
- [ ] #2 Behavior unchanged (unit, CLI, compat); bench numbers recorded
- [ ] #3 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
