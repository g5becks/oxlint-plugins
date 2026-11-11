---
id: TASK-003
title: 'Types: tsc -b green on TypeScript 7 (OX-04)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T16:55:00Z'
labels:
  - types
  - toolchain
milestone: m-0
dependencies:
  - TASK-002
documentation:
  - oxlint-plugins-audit.md
priority: high
type: chore
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit H4. `bun run check` reports 339 errors on TypeScript 5.9 (152 TS6305 project-reference errors; 58 in shipped non-vendored code, including 39 TS2322 in the `index.ts` files because `meta.type` is inferred as `string`). On TypeScript 7.0.2 it fails with TS5102 (`baseUrl` removed). `plugin-errorset` is missing from `references`.

## Implementation
1. Add `typescript` ~7.0.2 as a devDependency; `check` runs `tsc -b`.
2. Remove `baseUrl`; add every package to `references`; fix the project-reference setup (TS6305).
3. Exclude the vendored `src/upstream/` trees from the typecheck for now (they move to `vendor/` in Phase 2), or type them; record the choice.
4. Fix the remaining errors in shipped code with minimal, behavior-free changes (for example `as const` or `satisfies` on rule `meta`). Full rule typing is a Phase 3 task; don't start it here.
5. Turn on `erasableSyntaxOnly` and `verbatimModuleSyntax`: unit tests will load the `.ts` sources directly under Node type stripping (Phase 1), and these options make tsc reject syntax Node can't strip. Fix the fallout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 bun run check exits 0 on TypeScript 7.0.x for all six packages and the tests (any excluded paths listed with reasons)
- [x] #2 No baseUrl remains; erasableSyntaxOnly and verbatimModuleSyntax are on
- [x] #3 Built bundles behave identically: unit, compat and CLI results match the previous run
- [x] #4 Every check that was green when the task started is still green (frozen install, typecheck, unit, ESLint-compat, CLI and bench suites as they exist at the time); commands and results are recorded in the notes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Pin typescript 7.0.2 exactly (root keeps no ranges).
2. Package tsconfigs: drop baseUrl; add errorset to root references; root tsconfig becomes a solution (files: [], references) plus a tests project, fixing TS6305.
3. Exclude src/upstream/** (vendored, unshipped; moves to vendor/ in TASK-021) - record.
4. Fix remaining shipped-code errors with behavior-free changes (satisfies/as const on meta, etc.).
5. Enable erasableSyntaxOnly + verbatimModuleSyntax; fix fallout.
6. Verify bundles/unit/compat/CLI/bench unchanged.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- TypeScript: `typescript-7` = `npm:typescript@7.0.2` (exact alias) and `check` = `node node_modules/typescript-7/bin/tsc -b --pretty false`. `typescript` itself stays 5.9.3.
- tsconfig layout: tsconfig.base.json (shared options, now with erasableSyntaxOnly + verbatimModuleSyntax); root tsconfig.json is a solution file (files: [], references to all six packages incl. errorset, plus tests); each packages/<name>/tsconfig.json extends the base, composite, no baseUrl, includes src + tests; tests/tsconfig.json covers tests/**, scripts/** and the package sources the tests import (fixes TS6305/TS6307).
- Shipped-code fixes (behavior-free): `as const` on rule `meta.type` / `meta.fixable` literals in 37 rule files; query RuleMeta typed with the literal unions; five index.ts files declare the plugin object, call `eslintCompatPlugin(plugin)` (it converts rules in place and returns the same object) and export it, so `configs` is no longer an excess property of its `Plugin` type (errorset already spread its configs); explicit generic on sortDataByOrder; sortDataByOrder and solid `currentFunction()` throw an explicit Error in the unreachable empty case (previously a TypeError on undefined); `(x: any)` in one uniqueBy callback.
- Test fixes: CLI line arrays use `?? -1` for a missing label; router fixed-file read guarded; bench median/p95 typed; query exhaustive-deps test now asserts the actual suggestion (messageId fixTo + exact output) instead of a bare count (stricter, not weaker; ESLint accepted the number at runtime, its types do not).

## Decisions
- Two TypeScript installs: typescript-eslint 8.72.2 hard-fails on TS 7 ("typescript-eslint does not support TS 7.0"; peer range <6.1.0) and TS 7 has no Strada JS API, so the ESLint-based unit tests and the ESLint-compat suite need TS 5.9.3 as `typescript`. TS 7 is used only by `check`, via the alias. Revisit when typescript-eslint supports TS 7.
- Excluded from the typecheck: packages/*/src/upstream/** (vendored upstream code, not shipped or imported by shipped code, moves to vendor/ in TASK-021) and tests/**/fixtures/** (deliberately invalid lint input, not program code).

## Verification
- `bun run check` -> exit 0 on TypeScript 7.0.2 (was 339 errors on 5.9 / TS5102 on 7.0.2). `tsc -b --force --verbose` builds errorset, immutable, ts-no-assert, query, router, solidjs and tests. Sanity probes: a planted `const x: number = "x"` in packages/router/src and tests/ is reported, and a planted `enum` reports TS1294 (erasableSyntaxOnly); probes removed.
- `grep -rn baseUrl` in tsconfigs: none.
- `bun install --frozen-lockfile`: no changes.
- Unit 129 pass / 0 fail; compat 19 / 0; bench 4 / 0 (all = previous run).
- CLI per-test results via `bun test --reporter=junit` (51 pass / 53 fail) are identical, test by test, to the TASK-002 commit 818a1de.
- Bundle sizes: errorset 31.0 KB (=), immutable 27.0 (=), ts-no-assert 7.96 (+0.01), query 35.74 (+0.13), router 16.81 (+0.01), solidjs 122.90 (+0.25): the explicit unreachable-case throws and the eslintCompatPlugin call-then-export shape.
- Note for TASK-004: several CLI "all diagnostics are errors" tests pass vacuously (they filter by the stale `oxlint-plugin-<name>(` code prefix, get an empty list, and `every()` is true).

Consumer-visible change: none.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
tsc -b passes on TypeScript 7.0.2 (aliased as typescript-7; typescript-eslint keeps TS 5.9.3) for all six packages and tests: solution-style tsconfigs, errorset referenced, baseUrl removed, erasableSyntaxOnly/verbatimModuleSyntax on, behavior-free fixes; upstream/ and fixtures excluded. All suites unchanged test by test.
<!-- SECTION:FINAL_SUMMARY:END -->
