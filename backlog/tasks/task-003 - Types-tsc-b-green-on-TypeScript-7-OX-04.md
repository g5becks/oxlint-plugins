---
id: TASK-003
title: 'Types: tsc -b green on TypeScript 7 (OX-04)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 bun run check exits 0 on TypeScript 7.0.x for all six packages and the tests (any excluded paths listed with reasons)
- [ ] #2 No baseUrl remains; erasableSyntaxOnly and verbatimModuleSyntax are on
- [ ] #3 Built bundles behave identically: unit, compat and CLI results match the previous run
- [ ] #4 Every check that was green when the task started is still green (frozen install, typecheck, unit, ESLint-compat, CLI and bench suites as they exist at the time); commands and results are recorded in the notes
<!-- AC:END -->
