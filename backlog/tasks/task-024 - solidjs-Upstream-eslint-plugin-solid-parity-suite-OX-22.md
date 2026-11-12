---
id: TASK-024
title: 'solidjs: Upstream eslint-plugin-solid parity suite (OX-22)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T23:00:00Z'
labels:
  - solidjs
  - testing
milestone: m-2
dependencies:
  - TASK-023
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R11 and T3. On a 111-file corpus, 13 Solid rules match upstream site for site; `reactivity` reports 1 extra (`makePersisted(createSignal(...))` destructuring) and on agentx's client misses one upstream site (`WatchlistSheet.tsx:604`); `jsx-no-undef`'s excess was the R9 leak. `jsx-uses-vars` works since oxlint 1.56, but the README says to disable it.

## Implementation
1. Fetch eslint-plugin-solid's test suite at the upstream version the port follows (determined in the housekeeping task) into `vendor/`, and run it against the ports with oxlint's `RuleTester`.
2. Resolve or document (in `PARITY.md`) the `reactivity` divergences, including the `makePersisted` and `WatchlistSheet` cases (the corpus copy is under `tests/fixtures/corpus/`).
3. Decide whether to recommend `jsx-uses-vars` on oxlint >= 1.70; update the README and preset.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 eslint-plugin-solid's pinned upstream tests run in the unit job; skips cite PARITY.md
- [x] #2 The reactivity divergences are fixed or documented with tests
- [x] #3 The jsx-uses-vars recommendation is decided, recorded, and reflected in the README and preset
- [x] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [x] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Vendor eslint-plugin-solid v0.14.5 test/ (pristine) and run it via Node hooks: ruleTester shim -> oxlint RuleTester with our port; mock trackImports exactly like upstream's vitest.setup.js.
2. Fix port bugs the suites expose; record intentional divergences (parity.ts + PARITY.md).
3. Reactivity divergences: run upstream 0.14.5 and 0.19.0 and the port on the agentx files and minimal repros; pin with tests; document.
4. jsx-uses-vars: measure under oxlint, decide, README/preset; changeset.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Upstream suites
- vendor/eslint-plugin-solid@0.14.5/test/ (ruleTester.ts + 20 rule tests) copied pristine from tag v0.14.5 (commit 8409ccbe97daec892bd4d753c031030135cd35b7).
- tests/upstream/solid/{register.mjs,hooks.mjs,rule-tester-shim.ts,parity.ts,skipped-suites.test.ts,track-imports-mock.ts}: `../ruleTester` -> shim `run(name, rule, tests)` using our port of `name` in oxlint's RuleTester (eslintCompat, TSX; tsOnly cases run too); `../../src/rules/X` -> stub; vitest -> shared node:test shim; the port's utils/imports.ts -> a mock identical to upstream's vitest.setup.js mock of trackImports (upstream cases have no solid-js imports and rely on it). `test:upstream` = test:upstream:query && test:upstream:solid; part of test:unit (CI unit job, all ci-local unit legs).
- Runs: first 466 tests: 413 pass, 52 fail (most of them reactivity/no-react-deps cases needing the trackImports mock); with the mock: 8 failures, all real; after fixes: 465 pass, 0 fail, 1 skipped (jsx-uses-vars whole suite: drives ESLint 8 internals; PARITY.md#solid-jsx-uses-vars-suite). Same on the 1.70.0 RuleTester.

## Port fixes (from the 8 failures)
- imports: crash ("Cannot read properties of undefined (reading 'range')") fixing into `import "solid-js"` / `import {} from "solid-js"`; now uses upstream's appendImports (moved from jsx-no-undef to utils/fix-imports.ts and shared).
- New utils/static-value.ts (subset of eslint-utils getStaticValue: literals, templates, unary, binary, logical, TS wrappers, const resolution via the scope chain) replacing four ad-hoc evaluators: jsx-no-script-url now reports `"javascrip" + "t:..."`; no-innerhtml accepts concatenated static HTML (called without scope, exactly like upstream's getStringIfConstant: a CLI fixture showed upstream 0.14.5 still reports `innerHTML={html}` for a const `html`); style-prop reports `'margin-top': -10`; event-handlers shares it.
- style-prop: string-style fix drops declarations without a value (like style-to-object); vendor-prefixed kebab names accepted, camelCase vendor names get kebabStyleProp (PARITY.md#solid-style-prop-vendor-prefixes: more permissive than known-css-properties).

## Reactivity divergences (AC #2): documented with tests
Ran upstream eslint-plugin-solid 0.14.5 and 0.19.0 (eslint 9.39.5 + @typescript-eslint/parser 8.72.2) and the port on directive-stripped copies of agentx `client/src/utils/auth-store.tsx` (corpus) and `client/src/watchlist/WatchlistSheet.tsx` (read from agentx, copied to scratch only; agentx git status unchanged, 0 lines): 0.14.5 and the port report auth-store.tsx:34:43 (shouldDestructure) and nothing in WatchlistSheet; 0.19.0 reports WatchlistSheet.tsx:604:19 and not auth-store. Minimal reproductions show the same split; packages/solidjs/tests/reactivity-parity.test.ts pins the port's (0.14.5) behavior; PARITY.md#solid-reactivity-0145-vs-0190 records it. Moving to 0.19.0 semantics = porting 1,600+ lines of upstream diff: not done.

## jsx-uses-vars decision (AC #3)
Measured on oxlint 1.93.0 and 1.70.0 with the built-in no-unused-vars on `import { tooltip }; <div use:tooltip><Comp/></div>`: `tooltip` is reported with and without solidjs/jsx-uses-vars: a JS plugin's markVariableAsUsed does not reach oxlint's native rule, so the rule is a no-op under oxlint. Decision: not recommended for .oxlintrc.json (README: workaround `void tooltip;` or suppression); kept at "error" in configs.recommended, which only ESLint consumes and where it works (as upstream). CLI test "jsx-uses-vars under oxlint" pins the no-op (runner gained `keepBuiltins` to run without `-A all`).

## Verification
- `bun run gate` exit 0: unit 277/0, upstream query 1461 pass/1 skipped, upstream solid 465 pass/1 skipped, compat 40/0, repo 52/0, CLI 164/0, bench 4/0.
- Changeset .changeset/solidjs-upstream-parity.md (solidjs patch: bug fixes + docs).

Consumer-visible change: yes.

Verified with scripts/ci-local.sh (ebed8c2, PASS; 14 legs); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
eslint-plugin-solid 0.14.5's suites run unmodified against the ports in the unit job (465/465 runnable cases; jsx-uses-vars suite skipped per PARITY.md) after fixing an imports fixer crash, static evaluation and style-prop parsing; reactivity differences shown to be 0.14.5 vs 0.19.0 upstream changes (tests + PARITY.md); jsx-uses-vars measured as a no-op under oxlint and documented. Changeset: solidjs patch. Verified with scripts/ci-local.sh (ebed8c2, PASS).
<!-- SECTION:FINAL_SUMMARY:END -->
