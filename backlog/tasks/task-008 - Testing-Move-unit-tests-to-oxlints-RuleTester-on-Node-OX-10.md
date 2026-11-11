---
id: TASK-008
title: 'Testing: Move unit tests to oxlint''s RuleTester on Node (OX-10)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T18:07:00Z'
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
- [x] #1 All unit tests use RuleTester from oxlint/plugins-dev under node --test; ESLint's RuleTester remains only in the compat suite
- [x] #2 Per-rule case counts are at least the previous counts (table in the notes)
- [x] #3 Unit tests pass with the RuleTester from oxlint 1.70.0 and from the pinned oxlint
- [x] #4 ts-no-assert accepts as const in both ASTs, each tested in its own runtime
- [x] #5 The state-isolation harness exists and its approach is recorded
- [x] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Make src loadable by Node type stripping: explicit .ts extensions on relative imports (bundles must stay byte-identical).
2. tests/helpers/rule-tester.ts: oxlint RuleTester wired to node:test, TSX by default, OXLINT_RULE_TESTER override for other versions.
3. Convert every packages/*/tests file mechanically; compare per-rule case counts (JUnit before/after).
4. Thin ESLint flat-config compat suite (6 plugins, typescript-eslint) incl. ts-no-assert as const.
5. Probe RuleTester createOnce reuse; build CLI-based state-isolation harness + self-test; move the R9 probe onto it.
6. Scripts (test:unit via node --test, per package), tsconfig, ci.yml unit matrix (Node 22/24 x floor/pinned + macOS), ci-local images for Node 22 and 24.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- Relative imports in shipped src/ (83, non-upstream) now carry explicit `.ts` extensions so Node can load the sources; all six bundles byte-identical before/after (cmp).
- tests/helpers/rule-tester.ts: `RuleTester` from `oxlint/plugins-dev` with `RuleTester.describe/it` = node:test; `ruleTester(lang = "tsx")` (sourceType module, parserOptions.lang); `ruleOf(plugin, name)`; `OXLINT_RULE_TESTER=<path to dist/plugins-dev.js>` loads another version's RuleTester.
- All 41 unit test files converted mechanically (scratchpad convert.py: imports, `new RuleTester({...})` -> `ruleTester("ts"|"tsx")` (ts for the typescript-eslint non-JSX tester, tsx otherwise), `rule as any` -> `ruleOf`). Native mode everywhere: **no `eslintCompat: true` needed**; no case changed.
- `test:unit` = `node --test "packages/*/tests/*.test.ts"`, plus `test:unit:<name>` per package. tsconfig.base `types: ["bun"]` (TS 7 defaults `types` to []); package projects include the helper.
- ESLint: tests/eslint-compat/flat-config.test.ts (bun test): each of the six plugins in an ESLint 9 flat config with @typescript-eslint/parser, one valid + one invalid case, plus `as const` in typescript-eslint's AST. ESLint's RuleTester/Linter now only appear under tests/eslint-compat (grep -l eslint packages/*/tests -> none).
- State isolation: probe showed oxlint's RuleTester calls `createOnce` once per case (2 cases -> 2 calls on 1.93.0), so it cannot expose cross-file leaks. Harness = tests/cli/helpers/state-isolation.ts `lintSequence(configPath, files[])`: writes the files to a temp dir and lints them in order with `--threads 1` in one oxlint process, returning diagnostics per file. Self-test tests/cli/state-isolation.cli.test.ts uses a deliberately leaky fixture plugin (tests/cli/fixtures/harness/leaky-plugin.mjs) and expects exactly the leak file and every later file to be reported. The R9 probe (`test.failing("TASK-009: ...")`) now uses the harness (old fixture dir removed); run as a normal test it fails with b1..b5 reported, i.e. for the leak.
- CI: ci.yml unit job = ubuntu Node 22 + 24 x RuleTester {floor 1.70.0 via OXLINT_RULE_TESTER, pinned} + macOS Node 24 pinned; ci-local mirrors it (second image node:22-bookworm-slim + Bun 1.4.4). actionlint 1.7.12 clean.
- CONTRIBUTING.md: unit/compat/state-isolation layout and OXLINT_RULE_TESTER.

## Per-rule case counts (valid/invalid), before (bun + ESLint RuleTester, JUnit) = after (node --test + oxlint RuleTester, JUnit)
errorset: no-catch-errorset 6/4, no-new-error-in-errorset-fn 5/3, no-throw-errorset 4/3, no-unguarded-data-access 6/4, prefer-guard-over-manual-kind-check 4/3.
immutable: immutable-data 1/2, no-let 1/1, no-promise-reject 1/2, no-throw-statements 1/1, prefer-immutable-types 1/1, prefer-property-signatures 1/1, readonly-type 1/1, type-declaration-immutability 6/6.
query: exhaustive-deps 1/1, infinite-query-property-order 1/1, mutation-property-order 1/1, no-rest-destructuring 1/1, no-unstable-deps 1/1, stable-query-client 1/1.
router: create-route-property-order 1/1, route-param-names 2/1.
solidjs: all 20 rules 1/0.
ts-no-assert: no-type-assertion (.ts) 6/10, (.tsx) 3/3.
Total 129 = 129.

## Finding: `as const` AST (premise differs from the task text)
The task (and audit R14) say oxlint parses `as const` as TSTypeOperator. Mutation runs disproved that for every runtime tested: disabling the rule's TSTypeReference("const") branch fails 4 ts-no-assert cases in oxlint's RuleTester on 1.47.0, 1.70.0 and 1.93.0 (and 2 ESLint compat tests); disabling the TSTypeOperator branch fails nothing anywhere. So oxlint and typescript-eslint produce the same TSTypeReference shape. Per item 3 both branches are kept (TSTypeOperator defensively); the rule comment now says so; AC #4 is met in that `as const` is accepted and tested in both runtimes, each in its own runtime (oxlint RuleTester; ESLint flat config). Note added to TASK-018 (pre-1.70 fallbacks).

## Verification
- `bun run test:unit` (node v26.13.0): 129 pass / 0 fail on oxlint 1.93.0; `OXLINT_RULE_TESTER=<temp>/oxlint@1.70.0/dist/plugins-dev.js` -> 129 / 0.
- `bun run gate` exit 0: unit 129/0, compat 32/0 (19 + 13 new), repo 14/0, CLI 121/0 (incl. harness self-test and 3 test.failing markers), bench 4/0; check exit 0 on TS 7.0.2; lint/format clean.

Consumer-visible change: none (bundles byte-identical; only a source comment changed in ts-no-assert).

## ci-local (b4d5093)
Verified with scripts/ci-local.sh (b4d5093, PASS); GitHub Actions unavailable (billing lock). 13 legs pass: check x2; unit linux node v22.23.4 floor 129/0 and pinned 129/0 (TAP), node v24.22.2 floor 129/0 and pinned 129/0, macOS node v26.13.0 pinned 129/0; cli floor/pinned/macOS/latest[advisory]; eslint-compat; pack.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Unit tests (129 cases, per-rule counts unchanged) now run natively in oxlint's RuleTester under node --test, passing with the 1.70.0 and pinned RuleTester on Node 22/24 and macOS; ESLint covered by a flat-config compat suite; CLI-based state-isolation harness with self-test; as-const finding recorded. Verified with scripts/ci-local.sh (b4d5093, PASS).
<!-- SECTION:FINAL_SUMMARY:END -->
