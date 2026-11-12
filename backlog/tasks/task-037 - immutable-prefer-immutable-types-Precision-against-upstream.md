---
id: TASK-037
title: 'immutable/prefer-immutable-types: Precision against upstream'
status: To Do
assignee: []
created_date: '2026-11-11T23:03:00Z'
labels:
  - parity
milestone: m-4
dependencies:
  - TASK-025
priority: low
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The first parity report (TASK-025, scripts/parity.ts on tests/fixtures/corpus) shows the port reporting 3,725 sites where upstream eslint-plugin-functional 10.0.1 (enforcement ReadonlyShallow) reports 39 (all 39 shared): precision 1.0%. Upstream is type-aware (primitives and readonly types are immutable); the port is syntactic. Determine how much is option mapping vs port behavior, then reduce false positives or document the limit (README + PARITY.md).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Port precision against upstream on the corpus is measured and either at least 50% or the remaining gap is documented with examples in PARITY.md
<!-- AC:END -->
