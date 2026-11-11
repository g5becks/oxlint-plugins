---
id: TASK-006
title: 'CI: Workflow with an oxlint version matrix plus scripts/ci-local.sh (OX-05)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - ci
milestone: m-0
dependencies:
  - TASK-005
documentation:
  - oxlint-plugins-audit.md
priority: high
type: chore
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit T6 and U4. There is no CI. JS plugins are explicitly outside oxlint's semver, so every oxlint release can break these packages. GitHub Actions is currently unavailable for this account (billing lock), so both a workflow and a local mirror are needed.

## Implementation
1. `.github/workflows/ci.yml` on push to main and `release/**`, pull_request, workflow_dispatch, and a weekly schedule; `permissions: contents: read`; actions pinned by commit SHA. Jobs:
   - **check:** frozen install, lint, format check, typecheck, build.
   - **unit:** the unit tests as they exist (they move to Node in Phase 1; add Node 22 and 24 legs then).
   - **cli:** CLI suite and bench smoke on oxlint {1.70.0, pinned, latest} via `OXLINT_BIN`. 1.70.0 and pinned are blocking; latest is advisory on push and PR and blocking in the scheduled run (which exists to catch upstream breakage).
   - **eslint-compat:** ESLint 9 (ESLint 10 is added in Phase 2).
   - **pack:** `bun pm pack` each package, install the tarball into a temp consumer with the pinned oxlint, load it through `jsPlugins` and lint a fixture with one rule.
   - ubuntu for every job, plus macOS for unit and cli on the pinned version.
2. `scripts/ci-local.sh [ref]` mirrors every job. Port the approach of `/Users/takinprofit/Dev/StrataDb/scripts/ci-local.sh` and `/Users/takinprofit/Dev/errorset/scripts/ci-local.sh` (read them; don't modify those repos): clean clone of the ref, macOS legs on the host, Linux legs in Docker via Colima. Linux images need **Node** as well as Bun (oxlint and its RuleTester run on Node), so use a Node image with a pinned Bun, or an oven/bun image with Node added; check `node --version` in the container. Logs go under `/Users/takinprofit/Dev/oxlint-plugins-release/ci-local/<sha>/logs/`. Print a results table and `RESULT: PASS|FAIL`; advisory legs are labelled and don't fail the run.
3. Validate the workflow with a pinned actionlint.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ci.yml has check, unit, cli (oxlint 1.70.0, pinned, latest), eslint-compat and pack jobs plus a weekly schedule; actions are SHA-pinned; actionlint passes
- [ ] #2 The latest-oxlint leg is advisory on push and PR and blocking on the schedule
- [ ] #3 scripts/ci-local.sh mirrors every job, exits non-zero on failure, writes logs, and prints RESULT: PASS for HEAD
- [ ] #4 Linux legs run on Node plus Bun (versions recorded in the log)
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
