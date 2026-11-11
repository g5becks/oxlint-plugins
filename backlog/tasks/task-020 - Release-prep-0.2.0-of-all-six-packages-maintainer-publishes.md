---
id: TASK-020
title: 'Release prep: 0.2.0 of all six packages (maintainer publishes)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - release
milestone: m-1
dependencies:
  - TASK-019
documentation:
  - oxlint-plugins-audit.md
priority: high
type: chore
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Release prep for 0.2.0 of all six packages, together (audit section 6). Breaking for consumers.

## Implementation
1. Every other Phase 0 and Phase 1 task is Done and no `test.failing` marker remains.
2. Changesets bump all six packages to 0.2.0 (ts-no-assert goes from 0.1.2).
3. On `release/0.2.0`, run `scripts/release-prepare.ts`. ci-local must pass on the release commit and the branch. The pack job installs each tarball with oxlint 1.70.0 and the pinned version, loads its preset and lints a fixture.
4. RELEASE_NOTES.md links the migration guide with an absolute GitHub URL at the tag.
5. Follow the merge procedure the hand-off prompt authorizes: push the branch, open a PR, merge without squashing, and handle tags as the hand-off rules say. **Never publish.** Put the six publish commands, the SHA-512 values and the tarball paths in the notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All other Phase 0 and Phase 1 tasks are Done; no test.failing marker remains
- [ ] #2 All six packages are at 0.2.0 with changelog entries; the release commit passes ci-local on the commit and the branch
- [ ] #3 Six tarballs with SHA512SUMS and RELEASE_NOTES.md exist under /Users/takinprofit/Dev/oxlint-plugins-release/0.2.0/, each verified by the pack job on oxlint 1.70.0 and the pinned version
- [ ] #4 The release PR is merged without squashing; publish commands, SHA-512 values and tag details are in the notes
<!-- AC:END -->
