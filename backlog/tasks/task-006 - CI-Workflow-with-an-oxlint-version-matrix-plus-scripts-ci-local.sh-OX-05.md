---
id: TASK-006
title: 'CI: Workflow with an oxlint version matrix plus scripts/ci-local.sh (OX-05)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T17:48:00Z'
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
- [x] #1 ci.yml has check, unit, cli (oxlint 1.70.0, pinned, latest), eslint-compat and pack jobs plus a weekly schedule; actions are SHA-pinned; actionlint passes
- [x] #2 The latest-oxlint leg is advisory on push and PR and blocking on the schedule
- [x] #3 scripts/ci-local.sh mirrors every job, exits non-zero on failure, writes logs, and prints RESULT: PASS for HEAD
- [x] #4 Linux legs run on Node plus Bun (versions recorded in the log)
- [x] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. .github/workflows/ci.yml: check (actionlint, install, lint, format, typecheck, build, repo tests), unit (ubuntu+macOS), cli matrix {floor 1.70.0, pinned (ubuntu+macOS), latest (advisory except schedule)} with CLI + bench, eslint-compat, pack; weekly cron; contents: read; SHA-pinned actions (verified via gh api).
2. scripts/pack-smoke.ts: pack (or take release tarballs), check tarball contents, install into a consumer per oxlint version, load each plugin by package name, lint one fixture per plugin.
3. scripts/ci-local.sh mirroring every leg (clean clones; Linux in Docker on node:24 + Bun 1.4.4 image from scripts/ci-local/Dockerfile; macOS on host); logs under oxlint-plugins-release/ci-local/<sha>/logs; RESULT line.
4. Validate with actionlint 1.7.12 and run ci-local on HEAD.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Previously blocked (2026-11-11): ci-local Linux legs could not run oxlint JS plugins in the Colima VM; RESULT: FAIL on 6982cdb. Resolved by the maintainer; see "Resolution" below.

## ci-local run on 6982cdb (2026-11-11)
Table (logs: /Users/takinprofit/Dev/oxlint-plugins-release/ci-local/6982cdb/logs):
  check (actionlint 1.7.12) pass; check (linux) pass; unit (linux) pass; unit (macos) pass;
  cli (linux, oxlint floor 1.70.0) FAIL 3/117; cli (linux, oxlint pinned 1.93.0) FAIL 3/117; cli (macos, oxlint pinned 1.93.0) pass 120/0 + bench 4/0; cli (linux, latest=1.93.0) [advisory] FAIL 3/117; eslint-compat (linux) pass; pack (linux, 1.70.0 + 1.93.0) FAIL (tarball contents ok; every lint run aborted).
Versions recorded in logs: linux `node v24.22.2 / bun 1.4.4 / Linux aarch64`; macOS `node v26.13.0 / bun 1.4.4 / Darwin arm64`.

## Root cause (evidence)
- Every Linux failure is oxlint aborting (exit 134) with `thread 'tokio-rt-worker' panicked at crates/oxc_allocator/src/pool/fixed_size.rs:112:67: called Result::unwrap() on an Err value: ()` (234 panics in each CLI log, 12 in pack.log).
- Minimal repro independent of this repo (logs/oxlint-linux-repro: a one-rule no-op plugin + `const a = 1;`): oxlint 1.93.0 aborts in the CI image with --threads 1, 2, 4 and default; oxlint without JS plugins exits 0.
- oxc source (fixed_size.rs @ oxlint_v1.93.0): with JS plugins, oxlint creates one FixedSizeAllocator per thread, each a 4 GiB allocation aligned on 4 GiB, and unwrap()s the result ("Linux/Mac systems ... overcommit virtual memory").
- The Colima VM: MemTotal 6,053,288 kB, SwapTotal 0, vm.overcommit_memory=0 (heuristic), 4 CPUs. In the CI image a single 4 GiB ArrayBuffer succeeds but 5, 5.5, 6, 6.5 GiB all fail with "Out of memory": the heuristic refuses single mappings larger than RAM+swap, and the aligned 4 GiB request exceeds that. GitHub ubuntu runners (16 GB) are not affected.
- Not a plugin or test defect: the same commit passes the macOS CLI leg 120/0 and the pack smoke on macOS (1.70.0 and 1.93.0, run before the commit).

## Why I stopped instead of working around it
The fix is environmental: give the Colima VM more memory (e.g. `colima stop && colima start --memory 12`), or add swap / set vm.overcommit_memory=1 inside the VM. The run rules forbid starting/stopping Colima and modifying anything outside the repo, and making these Linux legs advisory would make ci-local less strict than ci.yml (hard rule 6). TASK-007..034 all depend on this task.

## To resume
After the maintainer enlarges the VM: `bash scripts/ci-local.sh HEAD` (expect PASS; verify the minimal repro first), then record "Verified with scripts/ci-local.sh (<sha>, PASS); GitHub Actions unavailable (billing lock)", check AC #3/#4/#5 (AC #1/#2 verified below), set Done, commit.

## Verified so far
- AC #1: ci.yml has check, unit (ubuntu+macOS), cli (floor 1.70.0 / pinned ubuntu+macOS / latest), eslint-compat and pack jobs, weekly cron `17 6 * * 1`, `permissions: contents: read`; actions SHA-pinned (checkout v7.0.1 3d3c42e, setup-bun v2.2.0 0c5077e, setup-node v7.1.0 949feb2; each resolved via `gh api repos/<repo>/commits/<tag>`); `rhysd/actionlint:1.7.12` exit 0.
- AC #2: cli job `continue-on-error: ${{ matrix.oxlint == 'latest' && github.event_name != 'schedule' }}`; ci-local labels the latest leg [advisory] unless CI_SCHEDULE=1.
- scripts/pack-smoke.ts on macOS (before commit): contents ok for all six; oxlint 1.70.0 and 1.93.0 each load all six plugins by package name and report the expected code (errorset 2, immutable 3, ts-no-assert 4, query 2, router 3, solidjs 2).

## Resolution
- Root cause: oxlint's JS-plugin allocator pool (oxc_allocator FixedSizeAllocatorPool) reserves a large block of address space per thread (one 4 GiB allocation aligned on 4 GiB). Linux heuristic overcommit (vm.overcommit_memory=0) refuses it on a 6 GiB VM without swap, so oxlint aborts at fixed_size.rs:112 (exit 134). It is an address-space reservation, not real memory use: the maintainer measured ~84 MB peak RSS for the same run on the macOS host.
- Fix (maintainer, 2026-11-11): `vm.overcommit_memory=1` in the Colima VM, applied live (`colima ssh -- sudo sysctl -w vm.overcommit_memory=1`) and persisted via a `provision` step in ~/.config/colima/default/colima.yaml. Colima not restarted; size unchanged (4 CPUs, 6 GiB). Re-verified: /proc/sys/vm/overcommit_memory = 1 in our CI image and the no-op-plugin repro exits 0 on oxlint 1.93.0.
- scripts/ci-local.sh now has a preflight: after building the image it runs a one-rule no-op JS plugin through the pinned oxlint in the CI image (log: preflight.log, which also records vm.overcommit_memory); on failure it prints the fix (sysctl command + colima.yaml provision step) and exits with RESULT: FAIL instead of failing every leg. The requirement is documented in the header comment of ci-local.sh (CONTRIBUTING.md is written in TASK-007).

## Verification (06c686a)
Verified with scripts/ci-local.sh (06c686a, PASS); GitHub Actions unavailable (billing lock).
- preflight: vm.overcommit_memory=1; no-op plugin on oxlint 1.93.0 -> "Found 0 warnings and 0 errors".
- check (actionlint 1.7.12) pass; check (linux) pass (lint, format, typecheck, build, repo tests 14/0); unit (linux) 129/0; unit (macos) 129/0; cli (linux, floor 1.70.0) CLI 120/0 + bench 4/0; cli (linux, pinned 1.93.0) 120/0 + 4/0; cli (macos, pinned) 120/0 + 4/0; cli (linux, latest=1.93.0) [advisory] 120/0 + 4/0; eslint-compat (linux) 19/0; pack (linux, 1.70.0 + 1.93.0) pack-smoke PASS.
- AC #3: exits non-zero on failure (6982cdb run: RESULT: FAIL, exit=1), writes logs to oxlint-plugins-release/ci-local/<sha>/logs, prints RESULT: PASS for HEAD.
- AC #4: every log starts with versions: linux `node v24.22.2 / bun 1.4.4 / Linux aarch64`, macOS `node v26.13.0 / bun 1.4.4 / Darwin arm64`.
- Not exercised: the preflight failure branch (the VM is fixed now); its message is static text in the script.

Consumer-visible change: none.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
CI workflow (check, unit, cli on oxlint 1.70.0/pinned/latest, eslint-compat, pack; weekly schedule; SHA-pinned; actionlint clean) and a local mirror scripts/ci-local.sh with a JS-plugin preflight. Verified with scripts/ci-local.sh (06c686a, PASS) after the maintainer set vm.overcommit_memory=1 in the Colima VM.
<!-- SECTION:FINAL_SUMMARY:END -->
