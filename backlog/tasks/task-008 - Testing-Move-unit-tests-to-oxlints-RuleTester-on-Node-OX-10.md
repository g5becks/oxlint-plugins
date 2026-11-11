---
id: TASK-008
title: 'Testing: Move unit tests to oxlint''s RuleTester on Node (OX-10)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - testing
milestone: m-1
dependencies:
  - TASK-007
documentation:
  - oxlint-plugins-audit.md
priority: high
type: chore
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit T1 and R14. Every unit test runs under ESLint's `RuleTester` with typescript-eslint: a different AST (R14's `as const` dual shape), scope manager and `createOnce` lifecycle than production, which is exactly why R9 and R10 went unnoticed. Oxlint has shipped its own `RuleTester` (`oxlint/plugins-dev`) since 1.43.

**Verified on 2026-11-11 (lead):** oxlint's `RuleTester` **refuses to run under Bun** ("not supported on ... other runtimes") on both 1.93.0 and 1.70.0. Under `node --test` (Node 26.13) it passes once TypeScript parsing is enabled with `languageOptions: { parserOptions: { lang: "tsx" } }` or a `.ts`/`.tsx` filename per case; without that, TypeScript syntax fails with "Parsing failed". Hook it up with `RuleTester.describe = describe; RuleTester.it = it` from `node:test`.

## Implementation
1. Unit tests run under Node's built-in test runner, loading the `.ts` sources through type stripping (Node >= 22.18). Add `test:unit` scripts (all, and per package). Use vitest on Node only if `node:test` proves unworkable, and record why.
2. Port **every** case from `packages/*/tests` to oxlint's `RuleTester`; record per-rule case counts before and after. Prefer native mode; use `eslintCompat: true` only as a temporary measure and list where.
3. **ts-no-assert keeps both `as const` shapes in the rule** (`TSTypeOperator` in oxlint, `TSTypeReference("const")` in typescript-eslint), because ESLint support is promised. Test the oxlint shape in RuleTester and the ESLint shape in the compat suite. (This deliberately differs from the audit's OX-10 wording.)
4. Keep a thin ESLint compatibility suite under `bun test`: each plugin loads in ESLint 9 flat config with the typescript-eslint parser, with one valid and one invalid case per plugin.
5. **State-isolation harness:** a helper that lints a sequence of files with one rule instance in one process, used by the R9 and R10 regression tests. First check whether RuleTester reuses the `createOnce` closure across cases; if it doesn't, build the harness on the CLI (`--threads 1`, several files). Record the approach.
6. Version matrix: unit tests must pass with the RuleTester from oxlint 1.70.0 and from the pinned version (for example an npm alias devDependency for 1.70.0, or an install in a temp dir). Update ci.yml and ci-local (unit job on Node 22 and 24).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All unit tests use RuleTester from oxlint/plugins-dev under node --test; ESLint's RuleTester remains only in the compat suite
- [ ] #2 Per-rule case counts are at least the previous counts (table in the notes)
- [ ] #3 Unit tests pass with the RuleTester from oxlint 1.70.0 and from the pinned oxlint
- [ ] #4 ts-no-assert accepts as const in both ASTs, each tested in its own runtime
- [ ] #5 The state-isolation harness exists and its approach is recorded
- [ ] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
