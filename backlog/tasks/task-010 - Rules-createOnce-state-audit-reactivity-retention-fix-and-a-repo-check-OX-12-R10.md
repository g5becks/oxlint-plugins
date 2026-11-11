---
id: TASK-010
title: >-
  Rules: createOnce state audit, reactivity retention fix and a repo check
  (OX-12, R10)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T20:08:00Z'
labels:
  - solidjs
  - bug
  - testing
milestone: m-1
dependencies:
  - TASK-009
documentation:
  - oxlint-plugins-audit.md
priority: high
type: bug
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R10 and P2. `reactivity` creates `const scopeStack = new ScopeStack()` once per worker; its `syncCallbacks` Set (`reactivity.ts:135`) gains AST nodes (`:559, 568, 587, 595`) and is never cleared, so it retains nodes from every file the worker lints (in LSP mode, for the whole editor session). Upstream eslint-plugin-solid creates a fresh ScopeStack per file; the port introduced this by moving to `createOnce`. Other `createOnce` rules (errorset x5, query x4, router x2) reset in `before()`; `jsx-no-duplicate-props` keeps state per visit.

## Implementation
1. Audit every `createOnce` body for closure-level mutable state (Set, Map, arrays, objects, class instances, `let`) and record a table: rule, state, where it's reset.
2. `reactivity`: create the `ScopeStack` (with `syncCallbacks` and the signal/prop lists) in `before()`.
3. Regression test with the state-isolation harness: linting file B after file A gives the same result as linting B alone, and per-file state starts empty.
4. Repo check (`scripts/check-createonce-state.ts`, using the TypeScript compiler API or oxc-parser): flag closure-level mutable state in `createOnce` that isn't reassigned or cleared in `before()`; immutable constants can be allowlisted with a justification comment. Run it in CI and ci-local.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The audit table of closure-level state in every createOnce rule is in the notes
- [x] #2 reactivity state is created per file; linting B after A equals linting B alone (test)
- [x] #3 The repo check runs in CI and ci-local, passes on the repo, and fails on a planted violation (mutation check recorded)
- [x] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [x] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. scripts/check-createonce-state.ts (TS compiler API): list closure-level state per createOnce and whether before() resets it -> audit table; fail on unreset state; allowlist comment.
2. Probe reactivity cross-file behavior with the harness; failing tests (CLI + ESLint) first.
3. reactivity: new ScopeStack + cleared import tracker per file in before(); functionStack resets in components-return-once and no-destructure.
4. Wire the check into `bun run lint` (CI check job + ci-local check leg + gate); repo tests incl. mutation cases.
5. Changeset, determinism, gate, ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Audit table: closure-level state in every createOnce (after this task; produced by `bun scripts/check-createonce-state.ts --report`)
| file:line | state | kind | status |
|---|---|---|---|
| packages/errorset/src/rules/no-catch-errorset.ts:56 | `tracker` | createErrorsetImportTracker(...) | reset |
| packages/errorset/src/rules/no-new-error-in-errorset-fn.ts:61 | `tracker` | createErrorsetImportTracker(...) | reset |
| packages/errorset/src/rules/no-new-error-in-errorset-fn.ts:64 | `errorsetFunctions` | new Set | reset |
| packages/errorset/src/rules/no-new-error-in-errorset-fn.ts:69 | `pendingViolations` | array | reset |
| packages/errorset/src/rules/no-throw-errorset.ts:86 | `tracker` | createErrorsetImportTracker(...) | reset |
| packages/errorset/src/rules/no-unguarded-data-access.ts:124 | `tracker` | createErrorsetImportTracker(...) | reset |
| packages/errorset/src/rules/no-unguarded-data-access.ts:126 | `guardedVarNames` | new Set | reset |
| packages/errorset/src/rules/prefer-guard-over-manual-kind-check.ts:73 | `tracker` | createErrorsetImportTracker(...) | reset |
| packages/query/src/rules/exhaustive-deps.ts:119 | `tracker` | createTanstackQueryImportTracker(...) | reset |
| packages/query/src/rules/no-rest-destructuring.ts:28 | `tracker` | createTanstackQueryImportTracker(...) | reset |
| packages/query/src/rules/no-rest-destructuring.ts:29 | `queryResultVariables` | new Set | reset |
| packages/query/src/rules/no-unstable-deps.ts:30 | `tracker` | createTanstackQueryImportTracker(...) | reset |
| packages/query/src/rules/no-unstable-deps.ts:31 | `trackedVariables` | object | reset |
| packages/query/src/rules/no-unstable-deps.ts:32 | `hookAliasMap` | object | reset |
| packages/query/src/rules/stable-query-client.ts:24 | `tracker` | createTanstackQueryImportTracker(...) | reset |
| packages/query/src/rules/stable-query-client.ts:26 | `useStateLocalName` | let | reset |
| packages/query/src/rules/stable-query-client.ts:27 | `reactNamespaceName` | let | reset |
| packages/query/src/utils/create-property-order-rule.ts:30 | `tracker` | createTanstackQueryImportTracker(...) | reset |
| packages/router/src/rules/create-route-property-order.ts:27 | `tracker` | createTanstackRouterImportTracker(...) | reset |
| packages/router/src/rules/route-param-names.ts:102 | `tracker` | createTanstackRouterImportTracker(...) | reset |
| packages/solidjs/src/rules/components-return-once.ts:44 | `functionStack` | array | reset |
| packages/solidjs/src/rules/jsx-no-undef.ts:97 | `missingComponentsSet` | new Set | reset |
| packages/solidjs/src/rules/no-destructure.ts:53 | `functionStack` | array | reset |
| packages/solidjs/src/rules/no-proxy-apis.ts:33 | `tracker` | trackImports(...) | reset |
| packages/solidjs/src/rules/no-react-deps.ts:24 | `tracker` | trackImports(...) | reset |
| packages/solidjs/src/rules/reactivity.ts:306 | `scopeStack` | let new ScopeStack | reset |
| packages/solidjs/src/rules/reactivity.ts:307 | `currentScope` | let | reset |
| packages/solidjs/src/rules/reactivity.ts:308 | `parentScope` | let | reset |
| packages/solidjs/src/rules/reactivity.ts:309 | `imports` | trackImports(...) | reset |

Before this task the same scan reported 7 declarations not reset: reactivity `scopeStack` (incl. syncCallbacks, signals, props), reactivity `matchImport`/`handleImportDeclaration` (trackImports importMap, never cleared), components-return-once `functionStack`, no-destructure `functionStack`, and query no-unstable-deps `trackedVariables`/`hookAliasMap` (false positive: reset by `delete` loops in before(); the checker now recognizes `delete x[k]`). Rules without closure state (not listed): the remaining solidjs rules, ts-no-assert, immutable (state is per visit).

## Findings beyond the audit
- reactivity's solid-js import tracker leaked across files (not in the audit): probe with the harness: b.tsx (declares its own `createSignal`, uses `count()` outside JSX) alone -> 0 reports; after a.tsx (imports `createSignal` from solid-js) -> "The reactive variable 'count' should be used within JSX, ..." at line 2. Real, order-dependent false positive.
- functionStack in components-return-once/no-destructure: push/pop balanced per file, so only stale after a mid-file abort; reset added for robustness (no behavior change on normal runs).

## Failing first
- CLI "reactivity state isolation > linting B after A equals linting B alone" and ESLint "solidjs/reactivity: a file's result does not depend on a previously linted file" both FAILED before the fix (B after A had the extra report; ESLint path leaked too). Both pass after.

## Fix
reactivity: `let scopeStack/currentScope/parentScope` + `const imports = trackImports()`; `before()` creates a new ScopeStack (fresh syncCallbacks, signals, props, items), rebinds currentScope/parentScope, and `imports.clear()`. components-return-once / no-destructure: `before() { functionStack.length = 0; }`.

## Repo check
scripts/check-createonce-state.ts (TypeScript compiler API): flags `let`/`var` and `const` bound to arrays, objects, `new`, or call results directly in a createOnce body unless before() reassigns it, calls `.clear()`/`.reset()`, sets `.length = 0` or deletes keys; allowlist with `// createonce-state: immutable (<reason>)`. Wired into `bun run lint` (so CI check job, ci-local check (linux) leg and `bun run gate` run it) and `bun run lint:state`. Mutation check: removing `missingComponentsSet.clear()` from a copy of jsx-no-undef -> exit 1 ("missingComponentsSet (new Set) is createOnce closure state not reset in before()"); planting `const seen = new Map()` in a copy of route-param-names -> exit 1, while an allowlisted planted `LOOKUP` is reported as allowlisted; repo -> exit 0 (29 declarations, 0 not reset). The mutation cases are also permanent tests in tests/repo/createonce-state.test.ts (4 tests).

## Verification
- Determinism (scripts/determinism.ts, 3 runs): 7173 diagnostics, sha256 162a9e34ef36396e each run (same as after TASK-009; the reactivity leak needs a specific file pair, covered by the new tests).
- `bun run gate` exit 0: lint (incl. state check), unit 129/0, compat 34/0, repo 18/0, CLI 123/0, bench 4/0.
- Changeset .changeset/solidjs-reactivity-state.md (oxlint-plugin-solidjs: patch).

Consumer-visible change: yes (reactivity no longer order-dependent / no longer retains AST nodes).

Verified with scripts/ci-local.sh (1732e94, PASS); GitHub Actions unavailable (billing lock). The check (linux) leg log shows "createOnce state: 29 declarations, 0 not reset".
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
All createOnce closure state audited (table in notes) and checked by a repo lint step (mutation-tested); reactivity recreates its scope stack and clears its import tracker per file, fixing AST-node retention and a newly found order-dependent false positive; function stacks reset per file. Changeset: solidjs patch. Verified with scripts/ci-local.sh (1732e94, PASS).
<!-- SECTION:FINAL_SUMMARY:END -->
