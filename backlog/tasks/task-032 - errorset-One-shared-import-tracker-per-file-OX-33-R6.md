---
id: TASK-032
title: 'errorset: One shared import tracker per file (OX-33, R6)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-12T14:32:00Z'
labels:
  - errorset
  - performance
milestone: m-3
dependencies:
  - TASK-031
documentation:
  - oxlint-plugins-audit.md
priority: low
type: chore
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R6. All five errorset rules run their own import tracker over the same file.

## Implementation
Share one tracker per file across the errorset rules (for example a WeakMap keyed by `sourceCode` or the Program node). Verify the key is the same object for every rule in both oxlint and ESLint; record the evidence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 One tracker computation per file is shared by all errorset rules in oxlint and ESLint (tests prove the sharing)
- [x] #2 Behavior unchanged (unit, CLI, compat); bench numbers recorded
- [x] #3 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Evidence: @oxlint/plugins documents the shared per-file cache pattern (before() acquire / after() release, all before hooks run before any visit, all after hooks before the next file); oxlint lint.js:21964-21966 registers a rule's after hook only when before() doesn't return false.
2. utils/shared-tracker.ts: module-level tracker per file, acquired in before() (only when not skipping), released in after() (ref count); declaration handling deduplicated per node so each ImportDeclaration/VariableDeclaration is processed once per file.
3. Tests: ESLint (all 5 rules, Linter): stats show one tracker and N processed nodes per file; oxlint CLI: env-gated globalThis stats read by a probe plugin; state isolation across files; existing unit/CLI/compat unchanged.
4. Diagnostics snapshot identical; bench numbers before/after; changeset (errorset patch); ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Evidence (sharing mechanism)
- @oxlint/plugins 1.93.0 index.js (eslintCompatPlugin docs, AfterHooksState): "all `before` hooks running before any rule starts visiting the AST, and all `after` hooks running after all rules have finished visiting the AST", with a per-file shared cache example (setupCache in before, teardownCache with a counter in after); "The above exactly matches the behavior when running a `createOnce` rule in Oxlint".
- oxlint 1.93.0 lint.js:21955-21970: per rule, before() runs (`=== !1` -> `continue`, so its after() is NOT registered), else its after hook is pushed; all befores run in this loop before the single `walkProgram`, then `runAfterHooks`. So a rule must acquire only when not skipping -> implemented (acquire after the early-exit check).
- The key: no WeakMap key needed. Files are linted sequentially per JS runtime and all befores precede the walk, so a module-level tracker created by the first acquire of a file and dropped by the last release is per file. (oxlint reuses one SourceCode object across files, so keying by sourceCode would have been wrong.)

## Implementation
- packages/errorset/src/utils/shared-tracker.ts: module-level FileTracker {tracker, processed: WeakSet}; `sharedTrackerHandle()` per rule with acquire(settings)/release() and the tracker's query methods; handleImportDeclaration/handleVariableDeclaration run once per node per file (first rule to visit it); others see the same state at the same traversal point (all rules' handlers for a node run before its children are visited).
- Rules: before(): settings; early exit (TASK-031); `tracker.acquire(settings)`; after(): `tracker.release()`. Redundant tracker resets in Program() removed.
- Test hook: `trackerStats()` export; published on globalThis[Symbol.for("oxlint-plugin-errorset/tracker-stats")] only when OXLINT_PLUGIN_ERRORSET_STATS=1.
- scripts/check-createonce-state.ts: a per-file handle counts as reset when before() calls `x.acquire(...)` AND after() calls `x.release()`; tests: both hooks -> reset, either alone -> NOT RESET, planted removal of release() in no-throw-errorset is caught.

## Tests proving sharing (AC #1)
- ESLint 9 and 10: tests/eslint-compat/errorset-shared-tracker.test.ts (all 5 rules, Linter): per file trackersCreated +1 and nodesProcessed == declaration count from the parsed AST (5; unshared would be 25); file without errorset: no tracker; interleaved files give identical results (no carry-over). 3/3 on both.
- oxlint: tests/cli/errorset-shared-tracker.cli.test.ts with probe plugin tests/cli/fixtures/tracker-probe/plugin.mjs reading the published stats: {"trackersCreated":1,"nodesProcessed":5}; passes on pinned 1.93.0 and 1.70.0.

## Behavior unchanged + bench (AC #2)
- Diagnostics snapshot: identical to the pre-TASK-029 snapshot (7218) excluding the new probe fixture dirs (skip-probe, tracker-probe).
- `bun run gate`: exit 0; unit 301, upstream 1457 (+5) / 462 (+4), compat 44 (+3), repo 54 (+2), CLI 272 (+1), bench 6.
- bench:profile errorset on corpus (0 corpus files import errorset; TASK-031 skips them), HEAD (56c7f18, temp worktree) vs working tree, 9 runs, alternated twice: wall 60.64 -> 60.66 ms (+0.0%), 61.68 -> 61.28 ms (-0.6%); callbacks 0.76 -> 0.73, 0.81 -> 0.76 ms.
- Errorset CLI fixtures (tests/cli/fixtures/errorset + errorset-patterns, 6 files importing errorset), interleaved 9 runs, sum of errorset rule times: 2.320 -> 2.448 ms (+5.5%, +0.13 ms): no speed gain (tracker work is tiny, as audit R6 said; the handle adds indirection). Kept for one computation per file per the task; noted in the changeset as no measurable speed difference.

## Consumer-visible
- None beyond an internal change (errorset patch changeset .changeset/errorset-shared-tracker.md).

Verified with scripts/ci-local.sh (7472057, PASS); GitHub Actions unavailable (billing lock). Shared-tracker CLI test passes on oxlint 1.70.0 floor and 1.93.0; compat tests on ESLint 9 and 10.
<!-- SECTION:NOTES:END -->
