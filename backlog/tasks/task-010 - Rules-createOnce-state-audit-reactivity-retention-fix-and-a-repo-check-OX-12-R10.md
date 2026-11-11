---
id: TASK-010
title: >-
  Rules: createOnce state audit, reactivity retention fix and a repo check
  (OX-12, R10)
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 The audit table of closure-level state in every createOnce rule is in the notes
- [ ] #2 reactivity state is created per file; linting B after A equals linting B alone (test)
- [ ] #3 The repo check runs in CI and ci-local, passes on the repo, and fails on a planted violation (mutation check recorded)
- [ ] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
