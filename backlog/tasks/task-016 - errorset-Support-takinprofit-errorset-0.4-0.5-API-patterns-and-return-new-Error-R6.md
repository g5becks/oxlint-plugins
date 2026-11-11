---
id: TASK-016
title: >-
  errorset: Support @takinprofit/errorset 0.4/0.5 API patterns and return new
  Error (R6)
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - errorset
milestone: m-1
dependencies:
  - TASK-015
documentation:
  - oxlint-plugins-audit.md
priority: high
type: feature
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
New since the audit. `@takinprofit/errorset` 0.4.0 and 0.5.0 (released 2026-11-11) changed the API these rules recognize, and agentx will move to them in the later migration epic:
- 0.4: no-context errors are plain objects with `.with({ cause })` (``throw X.kind`msg`.with({ cause })``); errors carry `set`; top-level `merge`, `recover`, `inspect`, `captureSync`, `captureAsync`, `isErr`.
- 0.5: object-form sets `errorSet(name, { kind: [keys] }).init<T>()`; merged guards from `merge(A, B)` and `A.merge(B, ...)` are set-level guards with `recover`/`inspect` but no kind guards, and narrow by `err.set`; `X.from(value)` returns an error or `undefined`; `toError(err)` returns a real `Error` (the sanctioned adapter for APIs that need a thrown Error).
- Audit R6: `no-new-error-in-errorset-fn` only matches `throw new Error`, not `return new Error`.

## Implementation
1. Add `@takinprofit/errorset` 0.5.0 as an exact devDependency. Read its README and LLMS.txt for the canonical patterns. Write fixtures against the real API and type-check them as part of the tests, so fixtures can't drift from the library.
2. Detection: object-form sets; merged guards (both forms) as set-level guards; `isErr` as a guard.
3. `no-throw-errorset`: also report ``throw X.kind`...`.with(...)``; don't report `throw toError(...)` (document why).
4. `no-unguarded-data-access`: merged guards and `err.set === "Name"` comparisons narrow.
5. `prefer-guard-over-manual-kind-check`: for a merged guard, suggest the original set's kind guard only when the set is known from an `err.set` check; otherwise no suggestion.
6. `no-new-error-in-errorset-fn`: also report `return new Error(...)`.
7. Keep 0.3-era patterns working (callable no-context errors such as ``X.kind`msg`({ cause })``).
8. README: supported errorset versions and a pattern table.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Fixtures for each 0.4/0.5 pattern type-check against @takinprofit/errorset 0.5.0 as part of the test run
- [ ] #2 Each rule's behavior on each pattern is tested (pattern x rule table in the notes), including .with(), merged guards, err.set narrowing, object-form sets, isErr and toError
- [ ] #3 no-new-error-in-errorset-fn reports return new Error; 0.3-era callable no-context patterns still work
- [ ] #4 The README lists supported errorset versions and patterns
- [ ] #5 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
