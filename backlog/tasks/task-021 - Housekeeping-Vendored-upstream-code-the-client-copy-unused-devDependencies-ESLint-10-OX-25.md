---
id: TASK-021
title: >-
  Housekeeping: Vendored upstream code, the client/ copy, unused
  devDependencies, ESLint 10 (OX-25)
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - toolchain
  - testing
milestone: m-2
dependencies:
  - TASK-020
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit H9, H10 and H12. `client/` is an 80-file copy of the agentx client that no test uses. The vendored `src/upstream/` trees (query 4,495 lines, solid 4,253 lines) are unpinned, unshipped and untested, and are the only users of `estraverse`, `is-html`, `kebab-case`, `known-css-properties`, `style-to-object` and `@typescript-eslint/utils`. ESLint 10 isn't tested.

## Implementation
1. Move the lintable sources from `client/` to `tests/fixtures/corpus/agentx-client/` (drop `public/`, `dev-dist/` and app configs). It becomes the parity and performance corpus.
2. Move vendored upstream code to `vendor/<upstream-package>@<version>/` with a README recording the upstream repo, version, commit and license. Determine which upstream version each port follows by diffing against published packages; record the evidence.
3. Drop devDependencies nothing uses any more (keep what the vendored test suites need in the next tasks).
4. Add ESLint 10 to the compat suite, ci.yml and ci-local.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 client/ is gone; its lintable sources live under tests/fixtures/corpus/ and are used by at least one test or script
- [ ] #2 Vendored code lives under vendor/<package>@<version>/ with provenance READMEs; the followed upstream versions are recorded with evidence
- [ ] #3 Unused devDependencies are removed (list in notes); ESLint 9 and 10 compat legs run in ci.yml and ci-local
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
