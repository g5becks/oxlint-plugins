---
id: TASK-031
title: 'Performance: Per-file early exits for JSX-only and errorset rules (OX-32, P3)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - performance
milestone: m-3
dependencies:
  - TASK-030
documentation:
  - oxlint-plugins-audit.md
priority: low
type: chore
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit P3. JSX-only Solid rules also run on `.ts` files; errorset rules could skip files that import no configured module.

## Implementation
1. Verify on oxlint 1.70.0 and the pinned version how a rule skips a file (for example `before()` returning `false`); record the evidence from docs or source.
2. JSX-only rules skip files without JSX; errorset rules skip files without a configured module or a same-file `errorSet` call.
3. Measure against the baseline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The skip mechanism is verified on oxlint 1.70.0 and pinned, with evidence recorded
- [ ] #2 Diagnostics on the corpus are unchanged (diff); bench numbers before and after are recorded
- [ ] #3 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
