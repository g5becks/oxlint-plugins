---
id: TASK-028
title: 'Performance: Profiling baseline for every plugin and rule (OX-34)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T23:37:00Z'
labels:
  - performance
  - testing
milestone: m-3
dependencies:
  - TASK-027
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit P1 and U2. Performance targets in Phase 3 need a recorded baseline. Measured during the audit (agentx client, oxlint 1.92, single thread): Solid costs about 47 ms (mostly `reactivity`); our other plugins are near zero. `--debug=timings` (1.84+) printed no table on 1.92.

## Implementation
1. The bench suite records per-plugin and per-rule cost on `tests/fixtures/corpus/` (single-threaded, median of at least 5 runs, warm-up run discarded) and writes JSON.
2. Commit a baseline file for this machine; record machine and versions.
3. Verify how to get oxlint's JS-plugin rule timings on the pinned version and document it, or record that it doesn't work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The bench suite writes per-plugin and per-rule medians on the corpus; a committed baseline records machine and versions
- [x] #2 oxlint rule-timing usage is documented or recorded as non-functional with evidence
- [x] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. tests/bench/profile.ts (bun run bench:profile): builds bundles, lints tests/fixtures/corpus/ with --threads 1; baseline run without JS plugins, each plugin with all its rules, each rule alone; 1 discarded warm-up + N>=5 runs, median wall ms; on oxlint versions that print --debug=timings (needs -f default) also median rule-callback ms. Writes JSON with machine (os, arch, cpu, cores, memory) and versions (oxlint, bun, node, commit).
2. Commit baseline tests/bench/baseline/<platform>-<arch>.json from this machine.
3. Bench test runs the profiler in quick mode (1 run, one plugin) to keep it working on floor and pinned.
4. Document timing usage: CONTRIBUTING.md (works on 1.93.0 with -f default; not on 1.70.0; agent format omits it), with evidence in notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- tests/bench/profile.ts (`bun run bench:profile`): real oxlint, --threads 1, corpus tests/fixtures/corpus (76 files); baseline (no JS plugins), each plugin with all rules, each rule alone; 1 discarded warm-up + --runs (default 5, min 5) runs; median wall ms, delta vs baseline, and median rule-callback ms from --debug=timings when printed (else null). JSON with machine (platform, arch, os release, cpu, cores, memory) and versions (oxlint, bun, node, commit, dirty). Output tests/bench/results/ (gitignored) or --out.
- Committed baseline tests/bench/baseline/darwin-arm64.json: Apple M5, 10 cores, 24 GiB, macOS 27.2.0 (Darwin), oxlint 1.93.0, bun 1.4.4, node 26.13.0, commit 4c60203 + this task's uncommitted profiler files (dirty=true; plugin sources unchanged), 9 runs.
- bench suite: quick-mode profiler test (ts-no-assert) + parser unit test; passes on pinned and 1.70.0.
- CONTRIBUTING.md "Profiling" section.

## Measured (baseline, medians of 9)
- No JS plugins: 30.6 ms. Any single JS plugin rule: +53-57 ms fixed (JS runtime load), so compare rules by callbacksMs.
- Plugin totals (wall / callbacks): errorset 85.8/1.62, immutable 99.8/4.63, ts-no-assert 83.1/0.21, query 85.9/1.37, router 84.5/0.73, solidjs 112.3/20.33 ms.
- Heaviest rule callbacks: solidjs/reactivity 13.97, jsx-uses-vars 8.64, jsx-no-script-url 8.58, jsx-no-undef 7.95, no-proxy-apis 5.10, event-handlers 3.86, immutable/prefer-immutable-types 2.94 ms. (~8 ms in the three jsx-* rules likely includes lazily built scope analysis charged to the first rule using it: not verified.)

## oxlint rule timings (AC #2), evidence
- oxlint 1.93.0: `oxlint -c <cfg> -A all --threads 1 --debug=timings -f default <corpus>` prints "Rule timings:" table (e.g. solidjs/reactivity 14.779 ms, 5203 calls, js-plugin) and "JS plugin runtime: Total 42.225ms / Rule callbacks 14.779ms / Shared overhead 27.447ms".
- Same command without -f, or with -f agent / json / stylish: no table (grep -c "Rule timings" = 0); in this shell the default format is the agent/unix-like one. `env -u CLAUDECODE` without -f: still 0.
- oxlint 1.70.0 with -f default --debug=timings: only "Found ..." / "Finished in 112ms on 76 files with 1 rules using 1 threads." — no table: non-functional on the floor.
- Documented in CONTRIBUTING.md#profiling.

## Verification
- `bun test ./tests/bench/bench.test.ts`: 6 pass (pinned); `OXLINT_BIN=<1.70.0> bun test ./tests/bench/bench.test.ts -t profiler`: 2 pass.
- `bun run gate`: exit 0 (unit 298, upstream 1457/462, compat 41, CLI 269, bench 6).

## Consumer-visible
- None (repo tooling only); no changeset.

Verified with scripts/ci-local.sh (ba2b34d, PASS); GitHub Actions unavailable (billing lock). Bench legs (incl. profiler smoke) pass on floor 1.70.0, pinned and macOS.
<!-- SECTION:NOTES:END -->
