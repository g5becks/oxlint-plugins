---
id: TASK-005
title: 'Repo: Lint, format and git hooks for the repo itself (H13)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - toolchain
milestone: m-0
dependencies:
  - TASK-004
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit H13. The repo has no lint or format config of its own beyond a stale root `.oxlintrc.json`, and no git hooks.

## Implementation
1. Lint the repo with the pinned oxlint (`.oxlintrc.json` covering `packages/*/src`, `scripts/`, `tests/`; exclude vendored `upstream/` code and fixtures).
2. Formatter: use oxfmt if a stable release is on npm, otherwise Biome 2.x; pin it exactly and record the choice.
3. lefthook (exact devDependency, installed by `prepare`): pre-commit formats and lints staged files; pre-push runs typecheck and unit tests; commit-msg enforces Conventional Commits with a small script.
4. Do the one-time reformat in its own commit with no logic changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Repo lint reports 0 issues and the format check is clean
- [ ] #2 lefthook pre-commit, pre-push and commit-msg hooks are installed by bun install and work (a bad commit message is rejected)
- [ ] #3 The reformat commit contains formatting only (tests and bundles unchanged)
- [ ] #4 Every check that was green when the task started is still green (frozen install, typecheck, unit, ESLint-compat, CLI and bench suites as they exist at the time); commands and results are recorded in the notes
<!-- AC:END -->
