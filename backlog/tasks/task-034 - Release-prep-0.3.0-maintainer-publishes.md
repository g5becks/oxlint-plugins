---
id: TASK-034
title: 'Release prep: 0.3.0 (maintainer publishes)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-12T14:54:00Z'
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
- [x] #2 Released packages have changelog entries; ci-local passes on the release commit and the branch
- [x] #3 Tarballs with SHA512SUMS and RELEASE_NOTES.md exist under /Users/takinprofit/Dev/oxlint-plugins-release/0.3.0/, verified by the pack job
- [x] #4 The release PR is merged without squashing; publish commands, SHA-512 values and tag details are in the notes
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

## release-prepare 0.3.0
- Dry run (3b1dfa3, temp worktree; log oxlint-plugins-release/logs/release-prepare-0.3.0-dry-run.log): exit 0, pack-smoke PASS; temp output removed afterwards.
- Real run on release/0.3.0 at 3b1dfa3 (log oxlint-plugins-release/logs/release-prepare-0.3.0.log): exit 0.
  - `changeset version`: 13 changesets consumed; versions (independent, per changeset bumps): oxlint-plugin-errorset 0.2.0 -> 0.2.1, oxlint-plugin-immutable 0.2.0 -> 0.3.0, oxlint-plugin-query 0.2.0 -> 0.3.0, oxlint-plugin-router 0.2.0 -> 0.2.1, oxlint-plugin-solidjs 0.2.0 -> 0.2.1, oxlint-plugin-ts-no-assert 0.2.0 -> 0.2.1. CHANGELOG.md entries added to all six; bun.lock updated; frozen install OK; gate passed.
  - Release commit 56f5b14d8e59539af96bcf2dc3eeeeffcc4daeb0 "chore(release): 0.3.0".
  - Local annotated tags (tag object -> commit 56f5b14), NOT pushed: oxlint-plugin-errorset@0.2.1 f7da16023188c79773d4a8218d7f12d8fc764bd5; oxlint-plugin-immutable@0.3.0 b4dd603daad9e64d8e6e98c085d8302f26b67f53; oxlint-plugin-query@0.3.0 3df4891ba5640736a338c939d7552ea122ba54b5; oxlint-plugin-router@0.2.1 9fa97650ed38421e851364e37f8a288d1afcc489; oxlint-plugin-solidjs@0.2.1 559139b8dff199ddbd1d529eaf053686df87c121; oxlint-plugin-ts-no-assert@0.2.1 5f2ac424c4b456b1db3e0ca4b5b6d9dbfc80f6b3.
  - ci-local on the release commit 56f5b14: RESULT: PASS (15 legs incl. pack on oxlint 1.70.0 + 1.93.0; CI_LOCAL.log in the release folder).
  - Tarballs in /Users/takinprofit/Dev/oxlint-plugins-release/0.3.0/, verified by pack-smoke on 1.70.0 and 1.93.0 (PASS: contents incl. THIRD_PARTY_NOTICES.md, one-rule lint and recommended preset per package). `shasum -a 512 -c SHA512SUMS`: all 6 OK. Also RELEASE_NOTES.md, NOTES-<tag>.md x6, MAINTAINER_COMMANDS.md.
  - SHA-512 / size:
    - oxlint-plugin-errorset-0.2.1.tgz (18306 B) 546e7f15ddabeff15b5ba9e998bbb1e86c7f48c9bad8b856900969ff5de7346ca00cce078a54f1a06ce0565dbba1b4974daf543335d72a6a7d9c0a1f62ac8a9b
    - oxlint-plugin-immutable-0.3.0.tgz (12311 B) 5b9e7a1597b6e862143c29418fefe0c33c3871cfc6b6a4a4da43c46ae3ad15ffd9176014b16bc6812129dcdea8f3be2d248f79a217fcc0d3449fa72fb542420d
    - oxlint-plugin-query-0.3.0.tgz (12531 B) 401eb22f4e1eca914fd8ec485e071353ae6c09705ad57abf42d64f3ef47bffd2d6239c5863ccd917412ba1553c09e310495a0901d05cb006740bdab5470a1c2c
    - oxlint-plugin-router-0.2.1.tgz (8035 B) a306a49c2edfc68bbb3b3d9c8514b2dd70d21c6798ccc8d01d6f650b3214098ba9532caec378217a0be17c97a4e1942e6fef89d8a21beaca7791403d64da1fd7
    - oxlint-plugin-solidjs-0.2.1.tgz (34209 B) db09696fc89b53102562e9fe4006850ab1490d2f37d0a5a3260040878152cb76834c187856fae8b6ea9626d305716efaa2a26466ecde32605fba63b4a09aace0
    - oxlint-plugin-ts-no-assert-0.2.1.tgz (6292 B) 735ed338ffbbba0b6be895ec955a28ac68772fbb85f113ae3df97508b224b1d89eb17b44f0dad56f026df1cd2badcd93a868c3cf44844ccbc7244a68033187a4

## Merge
- ci-local on the branch head d214177 (release/0.3.0): RESULT: PASS (log oxlint-plugins-release/logs/ci-local-0.3.0-branch.log). AC #2: changelog entries in all six released packages (## 0.2.1 / ## 0.3.0); ci-local PASS on the release commit 56f5b14 and the branch head d214177.
- `git push --no-follow-tags -u origin release/0.3.0`; `git ls-remote --tags origin` -> 0 tags.
- PR: https://github.com/g5becks/oxlint-plugins/pull/2 "release: 0.3.0" (body: release notes = changelog sections, task IDs). ci-local tables for 56f5b14 and d214177: https://github.com/g5becks/oxlint-plugins/pull/2#issuecomment-6826999271 . mergeStateStatus UNSTABLE = the billing-locked Actions checks.
- `gh pr merge 2 --merge` (merge commit, no squash, no admin) -> e64654128ae7938f257fc07b8f195f5ebb1e1ed2 (2026-11-12T14:54:19Z). `git switch main && git pull --ff-only`. All 19 local tags (0.1.x retroactive, 0.2.0, 0.3.0 release) are ancestors of main (`git merge-base --is-ancestor`); 0 tags on the remote.
- Verified with scripts/ci-local.sh (56f5b14, PASS; d214177, PASS); GitHub Actions unavailable (billing lock).

## Local tags for this release (NOT pushed; tag object -> commit 56f5b14d8e59539af96bcf2dc3eeeeffcc4daeb0)
- oxlint-plugin-errorset@0.2.1 f7da16023188c79773d4a8218d7f12d8fc764bd5
- oxlint-plugin-immutable@0.3.0 b4dd603daad9e64d8e6e98c085d8302f26b67f53
- oxlint-plugin-query@0.3.0 3df4891ba5640736a338c939d7552ea122ba54b5
- oxlint-plugin-router@0.2.1 9fa97650ed38421e851364e37f8a288d1afcc489
- oxlint-plugin-solidjs@0.2.1 559139b8dff199ddbd1d529eaf053686df87c121
- oxlint-plugin-ts-no-assert@0.2.1 5f2ac424c4b456b1db3e0ca4b5b6d9dbfc80f6b3

## Maintainer commands (run only when publishing; also in oxlint-plugins-release/0.3.0/MAINTAINER_COMMANDS.md)
```bash
cd /Users/takinprofit/Dev/oxlint-plugins && git push origin oxlint-plugin-errorset@0.2.1 oxlint-plugin-immutable@0.3.0 oxlint-plugin-ts-no-assert@0.2.1 oxlint-plugin-query@0.3.0 oxlint-plugin-router@0.2.1 oxlint-plugin-solidjs@0.2.1
cd /Users/takinprofit/Dev/oxlint-plugins-release/0.3.0
shasum -a 512 -c SHA512SUMS
npm publish ./oxlint-plugin-errorset-0.2.1.tgz --access public
npm publish ./oxlint-plugin-immutable-0.3.0.tgz --access public
npm publish ./oxlint-plugin-ts-no-assert-0.2.1.tgz --access public
npm publish ./oxlint-plugin-query-0.3.0.tgz --access public
npm publish ./oxlint-plugin-router-0.2.1.tgz --access public
npm publish ./oxlint-plugin-solidjs-0.2.1.tgz --access public
gh release create oxlint-plugin-errorset@0.2.1 --verify-tag --title oxlint-plugin-errorset@0.2.1 --notes-file NOTES-oxlint-plugin-errorset@0.2.1.md
gh release create oxlint-plugin-immutable@0.3.0 --verify-tag --title oxlint-plugin-immutable@0.3.0 --notes-file NOTES-oxlint-plugin-immutable@0.3.0.md
gh release create oxlint-plugin-ts-no-assert@0.2.1 --verify-tag --title oxlint-plugin-ts-no-assert@0.2.1 --notes-file NOTES-oxlint-plugin-ts-no-assert@0.2.1.md
gh release create oxlint-plugin-query@0.3.0 --verify-tag --title oxlint-plugin-query@0.3.0 --notes-file NOTES-oxlint-plugin-query@0.3.0.md
gh release create oxlint-plugin-router@0.2.1 --verify-tag --title oxlint-plugin-router@0.2.1 --notes-file NOTES-oxlint-plugin-router@0.2.1.md
gh release create oxlint-plugin-solidjs@0.2.1 --verify-tag --title oxlint-plugin-solidjs@0.2.1 --notes-file NOTES-oxlint-plugin-solidjs@0.2.1.md
```
The 0.2.0 release (TASK-020) must be published first: its tags and commands are in TASK-020's notes.
<!-- SECTION:NOTES:END -->
