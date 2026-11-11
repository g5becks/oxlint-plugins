---
id: TASK-030
title: 'solidjs/reactivity: Iterative traversal and cached lookups (OX-31, P2)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - solidjs
  - performance
milestone: m-3
dependencies:
  - TASK-029
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit P2. `reactivity`'s `walkTree` (`reactivity.ts:88-108`) recursively walks `Object.keys(node)` inside visitors: it depends on an undocumented node shape, risks stack exhaustion on deep generated JSX, and re-walks subtrees. `findVariable` (`:53-63`) walks scopes by name on every lookup.

## Implementation
1. Replace `walkTree` with an explicit stack or with information collected in the main visitor pass.
2. Cache variable lookups per identifier.
3. Add a test with very deep generated JSX (for example 5,000 levels) that must not overflow.
4. Measure against the Phase 3 baseline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 No recursive walkTree remains; deep generated JSX does not overflow (test)
- [ ] #2 The Solid plugin's corpus cost drops by at least 30% against the baseline (median, single-threaded); numbers in the notes
- [ ] #3 Diagnostics on the corpus are unchanged (diff)
- [ ] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
