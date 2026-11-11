---
id: TASK-028
title: 'Performance: Profiling baseline for every plugin and rule (OX-34)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - performance
  - testing
milestone: m-3
dependencies:
  - TASK-027
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit P1 and U2. Performance targets in Phase 3 need a recorded baseline. Measured during the audit (agentx client, oxlint 1.92, single thread): Solid costs about 47 ms (mostly `reactivity`); our other plugins are near zero. `--debug=timings` (1.84+) printed no table on 1.92.

## Implementation
1. The bench suite records per-plugin and per-rule cost on `tests/fixtures/corpus/` (single-threaded, median of at least 5 runs, warm-up run discarded) and writes JSON.
2. Commit a baseline file for this machine; record machine and versions.
3. Verify how to get oxlint's JS-plugin rule timings on the pinned version and document it, or record that it doesn't work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The bench suite writes per-plugin and per-rule medians on the corpus; a committed baseline records machine and versions
- [ ] #2 oxlint rule-timing usage is documented or recorded as non-functional with evidence
- [ ] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
