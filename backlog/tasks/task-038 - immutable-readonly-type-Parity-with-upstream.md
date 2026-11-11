---
id: TASK-038
title: 'immutable/readonly-type: Parity with upstream'
status: To Do
assignee: []
created_date: '2026-11-11T23:03:00Z'
labels:
  - parity
milestone: m-4
dependencies:
  - TASK-025
priority: low
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The first parity report (TASK-025) shows upstream eslint-plugin-functional 10.0.1 readonly-type with 1,516 sites vs the port's 679 (410 shared; recall 27.0%, precision 60.4%) on tests/fixtures/corpus. Check option defaults (generic vs keyword) and the parity config first, then fix or document.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Recall and precision are re-measured after aligning options; remaining differences are fixed or documented in PARITY.md
<!-- AC:END -->
