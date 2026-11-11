---
id: TASK-023
title: >-
  query/router: Run the vendored TanStack upstream tests against the ports
  (OX-21)
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 The vendored TanStack suites run in the unit job; every skipped case cites an entry in PARITY.md
- [ ] #2 exhaustive-deps reports on the same node as upstream (test)
- [ ] #3 route-param-names has at least five valid and five invalid oxlint-runtime cases; stable-query-client's React-only scope is documented
- [ ] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
