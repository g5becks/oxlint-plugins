---
id: TASK-031
title: 'Performance: Per-file early exits for JSX-only and errorset rules (OX-32, P3)'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-12T14:20:00Z'
labels:
  - performance
milestone: m-3
dependencies:
  - TASK-030
documentation:
  - oxlint-plugins-audit.md
priority: low
type: chore
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit P3. JSX-only Solid rules also run on `.ts` files; errorset rules could skip files that import no configured module.

## Implementation
1. Verify on oxlint 1.70.0 and the pinned version how a rule skips a file (for example `before()` returning `false`); record the evidence from docs or source.
2. JSX-only rules skip files without JSX; errorset rules skip files without a configured module or a same-file `errorSet` call.
3. Measure against the baseline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The skip mechanism is verified on oxlint 1.70.0 and pinned, with evidence recorded
- [x] #2 Diagnostics on the corpus are unchanged (diff); bench numbers before and after are recorded
- [x] #3 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Evidence: oxlint 1.93.0 lint.js:21964 and 1.70.0 lint.js:23651 skip a rule's visitor for the file when before() returns false; @oxlint/plugins eslintCompatPlugin (index.js:256) returns an empty visitor. Add a CLI test proving the skip on floor and pinned.
2. JSX-only Solid rules return false from before() for .ts/.mts/.cts files (cannot contain JSX). Errorset rules return false when the file has no non-type import from a configured module (the only way their tracker reports).
3. Verify: corpus diagnostics snapshot identical; bench:profile numbers before/after (errorset, solidjs) recorded; unit/upstream/CLI.
4. Changeset (solidjs, errorset patch), notes, commit, ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Skip mechanism (AC #1), evidence
- oxlint 1.93.0 node_modules/oxlint/dist/lint.js:21964: `if (beforeHook !== null && (timing === void 0 ? beforeHook() : timeCall(timing, beforeHook)) === !1) continue;` (the rule's visitor is not run for the file).
- oxlint 1.70.0 (npm oxlint@1.70.0) dist/lint.js:23651: `if (beforeHook !== null && beforeHook() === !1) continue;`.
- @oxlint/plugins 1.93.0 (bundled eslintCompatPlugin) index.js:256: `beforeHook !== null && beforeHook() === !1 ? EMPTY_VISITOR : ...` (same under ESLint). Type: `BeforeHook = () => boolean | void`.
- Pinned by tests/cli/skip.cli.test.ts (probe plugin tests/cli/fixtures/skip-probe/plugin.mjs whose before() returns false for "skipped.ts"): only visited.ts reported; passes with pinned 1.93.0 and OXLINT_BIN=oxlint 1.70.0.

## Implementation
- solidjs: utils/files.ts `cannotContainJSX(filename)` = /\.[cm]?ts$/ (.ts/.mts/.cts incl. .d.ts; .js/.jsx/.tsx not skipped). The 16 JSX-only rules (components-return-once, event-handlers, jsx-no-duplicate-props, jsx-no-script-url, jsx-no-undef, jsx-uses-vars, no-array-handlers, no-destructure, no-innerhtml, no-react-specific-props, no-unknown-namespaces, prefer-classlist, prefer-for, prefer-show, self-closing-comp, style-prop) return !cannotContainJSX(context.filename) from before() (after their existing per-file resets). Not gated (can report without JSX): imports, no-proxy-apis, no-react-deps, reactivity.
- errorset: utils/early-exit.ts `mayImportConfiguredModule(sourceText, settings)`: true if the text mentions any configured module name. All 5 rules return it from before() after resetting state. Every errorset rule reports only after tracker.hasErrorsetImport(), which requires a non-type ImportDeclaration from a configured module, whose source text then contains the module name; so skipped files could not report. Known edge: escape-sequence specifiers (documented in code + changeset).
- First version checked the AST (ImportDeclaration scan of context.sourceCode.ast) in before(): errorset wall -15..-18% but its before() forced AST deserialization (callbacks 1.8 -> 11-12 ms); replaced by the text check.

## Measurements (AC #2): bench:profile, --runs 9, HEAD bundle (temp git worktree at 13fdc6a) vs working tree, alternated twice
- errorset (text check, final): wall 87.86 -> 61.46 ms (-30.0%) and 88.66 -> 62.10 ms (-30.0%); delta over no-JS-plugins 55.99 -> 27.90 / 56.21 -> 29.99 ms; callbacks 1.65 -> 0.82 / 1.67 -> 0.84 ms.
- errorset (AST check, superseded): wall 102.85 -> 84.39 (-17.9%), 88.65 -> 75.11 (-15.3%).
- solidjs: wall 114.02 -> 113.55 (-0.4%), 113.80 -> 113.69 (-0.1%); callbacks 20.45 -> 20.80, 20.68 -> 20.68 (no change: corpus is mostly .tsx and reactivity/imports/no-proxy-apis/no-react-deps still walk every file).
- Diagnostics (all rules of each plugin on corpus + CLI + bench fixtures): identical to the pre-TASK-029 snapshot (7218) except 7 new diagnostics in this task's new fixture files tests/cli/fixtures/skip-probe/* (immutable rules on the probe plugin and its two .ts files).
- `bun run gate`: exit 0; unit 301, upstream 1457 (+5 skipped) / 462 (+4), compat 41, CLI 271 (+1 skip test), bench 6.

## Consumer-visible
- errorset patch (faster; escape-sequence specifier edge), solidjs patch (no result change). Changeset .changeset/early-exits-p3.md.
<!-- SECTION:NOTES:END -->
