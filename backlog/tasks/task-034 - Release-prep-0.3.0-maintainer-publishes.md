---
id: TASK-034
title: 'Release prep: 0.3.0 (maintainer publishes)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - release
milestone: m-3
dependencies:
  - TASK-033
documentation:
  - oxlint-plugins-audit.md
priority: high
type: chore
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Release prep for 0.3.0 (Phases 2 and 3).

## Implementation
1. Every other Phase 2 and Phase 3 task is Done and no `test.failing` marker remains.
2. Changesets bump the changed packages; on `release/0.3.0`, run `scripts/release-prepare.ts`; ci-local passes on the release commit and the branch; the pack job verifies every tarball.
3. Follow the authorized merge procedure; **never publish**; publish commands, SHA-512 values and tarball paths go in the notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All other Phase 2 and Phase 3 tasks are Done; no test.failing marker remains
- [ ] #2 Released packages have changelog entries; ci-local passes on the release commit and the branch
- [ ] #3 Tarballs with SHA512SUMS and RELEASE_NOTES.md exist under /Users/takinprofit/Dev/oxlint-plugins-release/0.3.0/, verified by the pack job
- [ ] #4 The release PR is merged without squashing; publish commands, SHA-512 values and tag details are in the notes
<!-- AC:END -->
