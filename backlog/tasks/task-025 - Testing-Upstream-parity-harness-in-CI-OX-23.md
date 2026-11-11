---
id: TASK-025
title: 'Testing: Upstream parity harness in CI (OX-23)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - testing
  - ci
milestone: m-2
dependencies:
  - TASK-024
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit T5 (the method behind R7, R11 and R12). Nothing compares the ports with the original ESLint plugins on real code.

## Implementation
`scripts/parity.ts` runs the upstream ESLint plugins (exact devDependencies: eslint-plugin-solid 0.19.0, @tanstack/eslint-plugin-query 5.107.1, @tanstack/eslint-plugin-router 1.162.0, eslint-plugin-functional 10.0.1, or newer pinned versions; record them) and the ports (through oxlint) over `tests/fixtures/corpus/`, and reports per-rule recall and precision with a site-level diff. Add it to CI and ci-local as an advisory job that writes the report to the logs. Record the first report in the notes and propose thresholds.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 scripts/parity.ts reports per-rule recall and precision against pinned upstream plugins on the corpus
- [ ] #2 An advisory parity job runs in ci.yml and ci-local; the first report and proposed thresholds are in the notes
- [ ] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
