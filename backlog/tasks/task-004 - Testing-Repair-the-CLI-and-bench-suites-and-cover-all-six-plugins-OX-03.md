---
id: TASK-004
title: 'Testing: Repair the CLI and bench suites and cover all six plugins (OX-03)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 All CLI tests pass on the pinned oxlint, including new errorset and ts-no-assert suites (test count recorded; at least the original 104)
- [ ] #2 The CLI suite also passes with OXLINT_BIN pointing at oxlint 1.70.0 installed in a temp directory
- [ ] #3 The bench suite passes and includes solidjs/reactivity
- [ ] #4 No test writes outside the repo's package dist directories or temp directories
- [ ] #5 Every test.failing marker names the task that removes it
- [ ] #6 Every check that was green when the task started is still green (frozen install, typecheck, unit, ESLint-compat, CLI and bench suites as they exist at the time); commands and results are recorded in the notes
<!-- AC:END -->
