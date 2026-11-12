---
id: TASK-034
title: 'Release prep: 0.3.0 (maintainer publishes)'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-12T14:45:00Z'
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
- [x] #1 All other Phase 2 and Phase 3 tasks are Done; no test.failing marker remains
- [ ] #2 Released packages have changelog entries; ci-local passes on the release commit and the branch
- [ ] #3 Tarballs with SHA512SUMS and RELEASE_NOTES.md exist under /Users/takinprofit/Dev/oxlint-plugins-release/0.3.0/, verified by the pack job
- [ ] #4 The release PR is merged without squashing; publish commands, SHA-512 values and tag details are in the notes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. AC #1 checked (all m-2/m-3 tasks Done incl. TASK-036; no test.failing markers).
2. release-prepare 0.3.0 --dry-run, then the real run on release/0.3.0 (changeset version, gate, release commit, local annotated tags, ci-local on the release commit, pack + pack-smoke on 1.70.0 and 1.93.0, SHA512SUMS, RELEASE_NOTES.md).
3. Record release notes in this task; ci-local on the branch head; push release/0.3.0 (no tags); PR 'release: 0.3.0' with changelog sections + task IDs; post both ci-local tables; gh pr merge --merge; switch main, pull --ff-only; verify tags are ancestors of main; record PR URL, merge commit, tags + SHAs, tarballs + SHA-512, maintainer commands; Done; commit and push main.
Versions: independent per changesets -> errorset, immutable, query 0.3.0 (minor changesets); router, solidjs, ts-no-assert 0.2.1 (patch only). '0.3.0' names the release, branch and folder.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC #1: TASK-021..033 and TASK-036 (milestones m-2, m-3) all Status Done with every AC checked (backlog task view); `git grep -nE 'test\.failing|it\.failing|todo: "TASK' -- tests packages ':!**/fixtures/**'`: 0 matches.
<!-- SECTION:NOTES:END -->
