---
id: TASK-004
title: 'Testing: Repair the CLI and bench suites and cover all six plugins (OX-03)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T17:02:00Z'
labels:
  - testing
milestone: m-0
dependencies:
  - TASK-003
documentation:
  - oxlint-plugins-audit.md
priority: high
type: chore
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit T4. The real-oxlint CLI suite fails 73 of 104 tests on every oxlint version (stale plugin names) and 16 more on >= 1.70 (assertions expect `oxlint-plugin-query(...)` codes, which 1.70 renamed to `query(...)`). It only covers router, query, functional and solid, and writes bundles to `ROOT/dist/plugin-*`. The bench suite fails 0 of 4 and doesn't include `reactivity`, the most expensive rule (audit P1).

## Implementation
1. CLI test configs come from the name map and use the short (>= 1.70) rule prefixes.
2. Assertions normalize diagnostic codes, so `oxlint-plugin-X(rule)` and `X(rule)` both match.
3. Use the package `dist/` bundles from the build script, or bundles built into a temp dir. Stop writing `ROOT/dist/plugin-*`.
4. Add CLI suites for **errorset** and **ts-no-assert**. Include the audit's U1 suppression probe: on >= 1.70 the short-form directive suppresses and the long form doesn't (this is expected oxlint behavior, documented in the test).
5. Bench: fix names, add `solidjs/reactivity`, use the pinned binary. Assert that runs succeed and that diagnostic counts match; record timings but don't assert on them.
6. If a test exposes a bug that a later task fixes (for example the `jsx-no-undef` leak), mark it with `test.failing` and the task ID; the fixing task removes the marker.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All CLI tests pass on the pinned oxlint, including new errorset and ts-no-assert suites (test count recorded; at least the original 104)
- [x] #2 The CLI suite also passes with OXLINT_BIN pointing at oxlint 1.70.0 installed in a temp directory
- [x] #3 The bench suite passes and includes solidjs/reactivity
- [x] #4 No test writes outside the repo's package dist directories or temp directories
- [x] #5 Every test.failing marker names the task that removes it
- [x] #6 Every check that was green when the task started is still green (frozen install, typecheck, unit, ESLint-compat, CLI and bench suites as they exist at the time); commands and results are recorded in the notes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. CLI runner: build bundles into a per-process mkdtemp dir (once per plugin), never ROOT/dist; normalize diagnostic codes (oxlint-plugin-X(rule) -> X(rule), rawCode kept); shared parser; extraArgs.
2. Existing suites compare normalized codes; "all diagnostics are errors" tests also require >= 1 diagnostic (they passed vacuously before).
3. New errorset (5 rules) and ts-no-assert suites with `// report`-marked fixtures, incl. the U1 suppression probe.
4. Known-bug probes as test.failing naming their fixing task: R9 leak (TASK-009), R3 unsafe fix (TASK-011), R1 re-exported sets (TASK-012).
5. Bench: all six plugins, solidjs/reactivity added, exact count assertions, timings logged only.
6. Run on pinned 1.93.0 and OXLINT_BIN=1.70.0.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- tests/cli/helpers/cli-runner.ts rewritten: bundles built with Bun.build into a per-process `mkdtemp(oxlint-cli-dist-)` dir (each plugin once, removed on exit); configs and --fix copies also in mkdtemp dirs; ROOT/dist/plugin-* is no longer written. Diagnostics carry `code` normalized by `normalizeCode()` (strips a leading `oxlint-plugin-`, so pre- and post-1.70 codes both match) and `rawCode` as printed; helpers ruleCode(), markedLines() (lines with a `// report` comment), reportedLines(); runOxlint accepts extraArgs; stderr returned.
- Existing suites: CODE = ruleCode(PLUGIN, rule); all-plugins checks normalized names. The 11 "all diagnostics are errors" tests now also assert at least one diagnostic (they passed vacuously at TASK-001..003 because the stale-prefix filter returned an empty list).
- New suites: tests/cli/errorset.cli.test.ts (5 rules x {marked lines, all errors} with in-file sets) and tests/cli/ts-no-assert.cli.test.ts (marked lines, error severity/exit code, and the U1 suppression probe: on >= 1.70 the short `ts-no-assert/` directive suppresses and the long `oxlint-plugin-ts-no-assert/` one does not - documented as expected oxlint behavior).
- Known-bug markers (each verified to fail for the audited reason by running real oxlint on the fixture):
  - `test.failing("TASK-009: ...")` in solidjs.cli.test.ts: jsx-no-undef with --threads 1 over a.tsx (no import) + b1..b5.tsx (clean) reports all six files.
  - `test.failing("TASK-011: ...")` in errorset.cli.test.ts: --fix rewrites throw -> return inside .map() callback and try/finally (diff confirmed).
  - `test.failing("TASK-012: ...")`: set imported from `@agentx/core` -> 0 diagnostics (expected line 6).
- Bench: all six plugins in the mixed config (15 rules incl. solidjs/reactivity, ts-no-assert, errorset); solid bench has 8 rules incl. reactivity; every run asserts exit code 0 and exact diagnostic/file counts (0 diagnostics; 6 files multi-file; 1 file solid); timings only logged.

## Verification
- Pinned oxlint 1.93.0: `bun run test:cli` 120 pass / 0 fail (104 original + 16 new incl. 3 test.failing markers); `bun run test:bench` 4 / 0 (cold 78 ms, warm median 76 / p95 78 ms, multi-file 92 ms, solid 75 ms on this machine; not asserted).
- `OXLINT_BIN=<mktemp>/ox-1.70.0/node_modules/.bin/oxlint` (oxlint 1.70.0, npm-installed in a temp dir): CLI 120 / 0, bench 4 / 0.
- No ROOT/dist after the runs (`ls dist` -> not found); `grep -rn "Bun.write|writeFile|mkdir|outdir" tests packages/*/tests` (excluding fixtures) -> only cli-runner writes, all into mkdtemp dirs.
- Other gates: frozen install no changes; `bun run check` exit 0 (TS 7.0.2); unit 129 / 0; compat 19 / 0.

Consumer-visible change: none.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Real-oxlint CLI suite repaired and extended: temp-dir bundles, normalized codes, errorset and ts-no-assert suites with the U1 suppression probe, known-bug probes for R9/R3/R1 marked test.failing with TASK-009/011/012. 120/120 on oxlint 1.93.0 and 1.70.0; bench 4/4 with reactivity and exact counts.
<!-- SECTION:FINAL_SUMMARY:END -->
