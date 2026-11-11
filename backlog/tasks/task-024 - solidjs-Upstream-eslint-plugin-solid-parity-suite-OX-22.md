---
id: TASK-024
title: 'solidjs: Upstream eslint-plugin-solid parity suite (OX-22)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - solidjs
  - testing
milestone: m-2
dependencies:
  - TASK-023
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R11 and T3. On a 111-file corpus, 13 Solid rules match upstream site for site; `reactivity` reports 1 extra (`makePersisted(createSignal(...))` destructuring) and on agentx's client misses one upstream site (`WatchlistSheet.tsx:604`); `jsx-no-undef`'s excess was the R9 leak. `jsx-uses-vars` works since oxlint 1.56, but the README says to disable it.

## Implementation
1. Fetch eslint-plugin-solid's test suite at the upstream version the port follows (determined in the housekeeping task) into `vendor/`, and run it against the ports with oxlint's `RuleTester`.
2. Resolve or document (in `PARITY.md`) the `reactivity` divergences, including the `makePersisted` and `WatchlistSheet` cases (the corpus copy is under `tests/fixtures/corpus/`).
3. Decide whether to recommend `jsx-uses-vars` on oxlint >= 1.70; update the README and preset.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 eslint-plugin-solid's pinned upstream tests run in the unit job; skips cite PARITY.md
- [ ] #2 The reactivity divergences are fixed or documented with tests
- [ ] #3 The jsx-uses-vars recommendation is decided, recorded, and reflected in the README and preset
- [ ] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
