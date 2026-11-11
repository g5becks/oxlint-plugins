---
id: TASK-020
title: 'Release prep: 0.2.0 of all six packages (maintainer publishes)'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T21:21:00Z'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preconditions: TASK-001..019 Done; no test.failing/todo markers; changesets bump all six to 0.2.0.
2. Pack job: verify each tarball's own recommended preset loads and lints (oxlint 1.70.0 + pinned); release notes link the migration guide at the tag.
3. Dry run, then release-prepare 0.2.0 on release/0.2.0 (version, gate, release commit, local tags, ci-local on the release commit, pack + verify, SHA512SUMS, notes).
4. ci-local on the branch head; push branch; PR with changelog sections + task IDs; comment both ci-local tables; merge with --merge; main ff; tags ancestors of main; notes; never push tags or publish.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Preconditions (2026-11-11)
- TASK-001..019: all Done (task view loop). `git grep -nE "test\.failing|todo: \"TASK"` over tests/ and packages/ (excluding fixtures): none.
- `changeset status`: minor for all six -> errorset 0.1.1, immutable 0.1.1, query 0.1.1, router 0.1.1, solidjs 0.1.1, ts-no-assert 0.1.2 all -> 0.2.0.

## Release tooling changes (this commit)
- scripts/pack-smoke.ts: for every tarball and oxlint version, also reads the installed package's `configs.recommended` with Node and lints the fixture with exactly that preset: no stderr/config errors, only preset rules report, the smoke rule reports. Local run on oxlint 1.70.0 and 1.93.0: PASS for all six presets (errorset 5 rules, immutable 5, ts-no-assert 1, query 6, router 2, solidjs 20).
- scripts/release-prepare.ts: when docs/migration-<major.minor>.md exists, RELEASE_NOTES.md and each NOTES-<tag>.md start with "Migration guide: https://github.com/g5becks/oxlint-plugins/blob/<url-encoded tag>/docs/migration-0.2.md".

## release-prepare 0.2.0 (real run, on release/0.2.0 at aa632a4; log oxlint-plugins-release/logs/release-prepare-0.2.0.log)
- Dry run first (aa632a4): exit 0, all six -> 0.2.0, pack-smoke PASS incl. presets on 1.70.0 and 1.93.0; repo untouched afterwards.
- `changeset version`: all six 0.2.0 (ts-no-assert from 0.1.2); 14 changesets consumed; CHANGELOG.md entries added to every package; bun.lock workspace versions updated; frozen install OK; `bun run gate` passed.
- Release commit de302ffef948ac38ba85be79ceb1bf3e656ee17a "chore(release): 0.2.0".
- Local annotated tags (tag object -> commit): oxlint-plugin-errorset@0.2.0 9c4345a, oxlint-plugin-immutable@0.2.0 d791a69, oxlint-plugin-ts-no-assert@0.2.0 846bae5, oxlint-plugin-query@0.2.0 56c884f, oxlint-plugin-router@0.2.0 940c0f2, oxlint-plugin-solidjs@0.2.0 33db905 -> all de302ff. NOT pushed.
- ci-local on the release commit de302ff: RESULT: PASS (13 legs; CI_LOCAL.log in the release folder).
- Packed into /Users/takinprofit/Dev/oxlint-plugins-release/0.2.0/; pack-smoke --tarballs on oxlint 1.70.0 and 1.93.0: PASS (30 ok, 0 FAIL: contents x6, one-rule lint x12, recommended preset x12). `shasum -a 512 -c SHA512SUMS`: all OK.

## Tarballs (path, size, SHA-512)
- /Users/takinprofit/Dev/oxlint-plugins-release/0.2.0/oxlint-plugin-errorset-0.2.0.tgz 16932 B b536cfb0284b1f47fc237dfd97b2be5b734897922b3865984d8f8c115bbb83bc26cb5b322a3de120944c195eb377005443e24979310d138132575c27faca9ccc
- .../oxlint-plugin-immutable-0.2.0.tgz 9297 B c3e1275fa538b26a7b915ae7e26d5e114df9ac66b8fc8c0aefc4b159258caceab7cefdd2e88c2081334ca7a6b61c25c1bcd29e399982c30d6b08de1cca2e7ede
- .../oxlint-plugin-query-0.2.0.tgz 11416 B 335aeb8ec0a945ddf8746af5d6f88b2779d60b3d2bfa0d16729b0236e7c21ee8c0336847e147336bd3f4dc0b6f9bcf1510d01f3249ce54fda0c51738d9ab7819
- .../oxlint-plugin-router-0.2.0.tgz 7762 B 407c46264849b0f6338582e464b052c74c5e7c162694a35481f1b338d459982bce3cae0635268b0d05a89aa9d122bf5d308653423dc7a05999164b03904ddbbd
- .../oxlint-plugin-solidjs-0.2.0.tgz 30192 B 449aa3f0df329d9a203ce934e00a909a33acefb3d8a86d914ae5f918543b537bd23aa7d781e1a7f7b9d46005367bc580cd9dff01963e6470964e9fa69832408e
- .../oxlint-plugin-ts-no-assert-0.2.0.tgz 6014 B ede27e9b1ed1312bdb1ad5088070615e3478c64953440d68d49d8ec7f1f863b85bb2eec90c9e261deae16b6fa16fa288a8c68bf27c5819894e7d7cf718ad3df9
- RELEASE_NOTES.md links https://github.com/g5becks/oxlint-plugins/blob/oxlint-plugin-errorset%400.2.0/docs/migration-0.2.md; each NOTES-<tag>.md links the guide at its own tag.
<!-- SECTION:NOTES:END -->
