---
id: TASK-023
title: >-
  query/router: Run the vendored TanStack upstream tests against the ports
  (OX-21)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T22:47:00Z'
labels:
  - query
  - router
  - testing
milestone: m-2
dependencies:
  - TASK-022
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit T3, R12 and R13. 3,000+ lines of TanStack upstream tests (`_tests_upstream/`: exhaustive-deps 1,088 lines, no-rest-destructuring, no-void-query-fn, mutation-property-order, infinite-query-property-order, stable-query-client, no-unstable-deps) never run. `exhaustive-deps` reports one line lower than upstream (on `queryKey` instead of the options object). `stable-query-client` is React-only by design. `route-param-names` has no upstream counterpart and only 2-3 tests.

## Implementation
1. Run the vendored suites against the ports with oxlint's `RuleTester` (`eslintCompat: true` is acceptable for upstream cases).
2. Produce a parity report; list intentional divergences in `PARITY.md`, each linked to the test cases it covers (skipped with a reason that points at `PARITY.md`).
3. Align the `exhaustive-deps` report node with upstream.
4. Document that `stable-query-client` is a no-op for Solid.
5. Add oxlint-runtime tests for `router/route-param-names` (at least five valid and five invalid cases).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The vendored TanStack suites run in the unit job; every skipped case cites an entry in PARITY.md
- [x] #2 exhaustive-deps reports on the same node as upstream (test)
- [x] #3 route-param-names has at least five valid and five invalid oxlint-runtime cases; stable-query-client's React-only scope is documented
- [x] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [x] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Run the vendored suites unmodified via Node module hooks (tests/upstream/query): RuleTester shim -> oxlint RuleTester (eslintCompat) with OUR port by rule name; vitest shim on node:test; combinate shim; upstream rule modules re-exported with `rule` replaced; sort-data-by-order util -> port util.
2. Classify failures: fix ports or record intentional divergences (parity.ts + PARITY.md).
3. exhaustive-deps report node: measure upstream, test first, align.
4. route-param-names >= 5/5 cases; stable-query-client React-only docs; wire into test:unit (CI unit job + ci-local).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- `bun run test:upstream` = `node --import ./tests/upstream/query/register.mjs --test` over vendor/@tanstack/eslint-plugin-query@5.91.4/src/__tests__/*.test.ts (minus no-void-query-fn) + tests/upstream/query/skipped-suites.test.ts. Resolve/load hooks (tests/upstream/query/hooks.mjs): `@typescript-eslint/rule-tester` -> shims/rule-tester.ts (runs the cases against our port of the rule named in `ruleTester.run(name, ...)` in oxlint's RuleTester, eslintCompat, lang tsx; skips cases listed in parity.ts with a reason linking PARITY.md); `vitest` -> shims/vitest.ts (describe/it/test incl. `.each`, afterAll, expect.toEqual/toBe on node:test); `combinate` -> shim unwrapping its CJS default; `../rules/X/X.rule` -> synthesized module re-exporting the real upstream module (its constants) with `rule` replaced; `../utils/sort-data-by-order` -> the port's util; extensionless relative imports -> `.ts`. `test:unit` now = node --test packages/*/tests && test:upstream, so the CI unit job and all ci-local unit legs (Node 22/24, floor/pinned RuleTester, macOS) run it.
- devDependencies: `combinate` 1.1.11 (exact) and `@typescript-eslint/utils` 8.72.2 re-added (exact; imported by the upstream rule modules whose constants the suites use).
- First full run: 1462 tests, 1437 pass, 24 fail, all `no-unstable-deps` "result of X is passed to useAlias as dependency": upstream 5.91.4 matches only `import { useX as useAlias } from "React"` (capital R), the port only "react". Port now accepts both (PARITY.md#query-no-unstable-deps-react-module).
- Final: 1462 tests, 1461 pass, 0 fail, 1 skipped (no-void-query-fn whole suite: not ported, needs type info; PARITY.md#query-no-void-query-fn). Same on the 1.70.0 RuleTester.

## exhaustive-deps report node
- 5.91.4 (vendored) reports on the queryKey Property; 5.107.1 (current, the version the audit compared) visits ObjectExpression and reports on the options object. Measured with real 5.107.1 in ESLint 9.39.5 on a sample: line 3 col 22 -> line 6 col 4.
- packages/query/tests/exhaustive-deps-node.test.ts (eslintCompat columns) asserts that location + the exact suggestion; FAILED before (actual 4:5-4:25), passes after `context.report({ node: node.parent, ... })`. The CLI query suite expected lines [19, 30] (queryKey lines) -> [18, 29] (useQuery({ lines), comment added: intentional behavior change. Vendored cases don't assert positions (still pass).

## Other
- route-param-names unit: 9 valid (incl. optional {-$x}, splat $, braced {$b$}, prefix{$c}.json, createLazyFileRoute, template literal, solid-router, non-TanStack import, dynamic path) + 6 invalid (incl. data.paramName and two errors in one path): 15/15.
- PARITY.md (repo root): versions table, query-no-void-query-fn, query-no-unstable-deps-react-module, query-exhaustive-deps-report-node, query-stable-query-client-react-only; Solid section deferred to TASK-024. Query README: parity section + stable-query-client React-only note.
- Changeset .changeset/query-upstream-parity.md (query **minor**: report location moves, with migration for disable comments).

## Verification
`bun run gate` exit 0: unit 275/0 + upstream 1461 pass / 1 skipped, compat 40/0, repo 52/0, CLI 163/0, bench 4/0.

Consumer-visible change: yes.

Verified with scripts/ci-local.sh (5498c62, PASS); GitHub Actions unavailable (billing lock). Unit legs (node 22 floor TAP, node 24 pinned, macOS) each report 275 pass + upstream 1461 pass / 1 skipped. (An earlier ci-local run on d8b15a4 happened after a rejected commit (header > 100 chars) and does not count.)
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
The vendored TanStack Query 5.91.4 suites (1,462 cases) run unmodified against the ports in the unit job via Node module hooks: 1,461 pass, no-void-query-fn suite skipped (not ported; PARITY.md). no-unstable-deps accepts upstream's "React" alias source; exhaustive-deps reports on the options object like upstream 5.107 (test); route-param-names has 9 valid / 6 invalid cases; stable-query-client documented React-only. Changeset: query minor. Verified with scripts/ci-local.sh (5498c62, PASS).
<!-- SECTION:FINAL_SUMMARY:END -->
