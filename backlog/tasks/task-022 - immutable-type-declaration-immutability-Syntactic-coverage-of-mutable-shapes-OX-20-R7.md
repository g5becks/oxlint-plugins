---
id: TASK-022
title: >-
  immutable/type-declaration-immutability: Syntactic coverage of mutable shapes
  (OX-20, R7)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T22:32:00Z'
labels:
  - immutable
  - bug
milestone: m-2
dependencies:
  - TASK-021
documentation:
  - oxlint-plugins-audit.md
priority: high
type: bug
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R7 (High). `type-declaration-immutability` only inspects `TSTypeLiteral` and `TSIntersectionType` aliases plus interfaces (`type-declaration-immutability.ts:84-117`). Against upstream `eslint-plugin-functional@10.0.1` (21 of 22 expected results) the port has 8 false negatives (unions, `T[]`, `Map`, mapped types, `Partial`, `Record`, `Array<...>`, mutable tuples) and 1 false positive (`readonly items: string[]`, which upstream accepts as ReadonlyShallow).

## Implementation
Without type information, cover the syntactic forms:
1. union constituents;
2. top-level `TSArrayType` and `TSTupleType` (mutable unless wrapped in `readonly`);
3. `TSMappedType` without a `readonly` modifier;
4. well-known mutable references (`Array`, `Map`, `Set`, `Record`, and `Partial`/`Required`/`Pick`/`Omit` over a mutable literal);
5. ReadonlyShallow semantics: `readonly x: T[]` is accepted.

Commit the 22-case probe first as tests. Document the limits where type information would be needed. More reports for consumers, so the changeset says so.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [x] #2 The 22-case probe matches upstream on at least 21 of 22; readonly x: T[] is accepted
- [x] #3 The README documents what the rule can't see without type information
- [x] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [x] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Rebuild the 22-case probe (9 audit cases + 13 common shapes); get expected results by running upstream eslint-plugin-functional@10.0.1 (type-aware, ReadonlyShallow/AtLeast); commit as RuleTester test; record port failures.
2. Rewrite as a tri-state syntactic classifier (mutable/readonly/unknown); ReadonlyShallow members.
3. Extra unit cases; README limits; changeset (more reports).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Probe (failing first)
- The audit lists 9 of the 22 cases; the other 13 are not in the audit, so the probe was rebuilt: T01-T09 = the audit's 9, T10-T22 = { readonly a }, { a }, readonly string[], ReadonlyArray, readonly tuple, readonly mapped, Readonly<{ a }>, interface readonly/mutable, primitive alias, readonly & readonly, readonly & mutable, ReadonlyMap.
- Expected results from upstream **eslint-plugin-functional@10.0.1** run for real (eslint 9.39.5, typescript 5.9.3, @typescript-eslint/parser 8.72.2 projectService; `rules: [{ identifiers: "^.+$", immutability: "ReadonlyShallow", comparator: "AtLeast" }]`, ignoreInterfaces false): 11 report (T01-T08, T11, T18, T21), 11 ok. Matches the audit's 9 explicit verdicts.
- packages/immutable/tests/type-declaration-immutability-probe.test.ts. On the old rule: 9 of 22 FAILED (T01-T08 missed, T09 `{ readonly items: string[] }` false positive) = 13/22, exactly the audit's numbers.

## Implementation
`verdictOf(typeNode)` -> "mutable" | "readonly" | "unknown"; only "mutable" is reported. TSTypeLiteral: every property/index signature must be `readonly` (ReadonlyShallow: value types not inspected, so `readonly items: string[]` is accepted); TSArrayType/TSTupleType mutable; `readonly` type operator readonly; TSMappedType readonly only with `readonly`/`+readonly`; unions and intersections: mutable if any member is, unknown if any is unknown; references: Array/Map/Set/WeakMap/WeakSet/Record mutable, Readonly/ReadonlyArray/ReadonlyMap/ReadonlySet readonly, Partial/Required/Pick/Omit/NonNullable follow their first type argument, anything else unknown; keyword types readonly. Interfaces use the same member check.

## Results
- Probe: 22/22 agree with upstream (requirement >= 21). All type-declaration-immutability tests 49/49 (12 existing + 15 new edge cases incl. Set, WeakMap, Required/Pick/Omit over mutable and readonly literals, -readonly mapped, index signature, Partial<SomeType> unknown); immutable unit 50/50 also with the 1.70.0 RuleTester; immutable/presets/corpus CLI 34/0.
- README: "type-declaration-immutability without type information" table + what it can't see (named types, classes/generics, deep immutability).
- Changeset .changeset/immutable-type-declaration-coverage.md: immutable **minor** (more reports), with migration.
- `bun run gate` exit 0: unit 262/0, compat 40/0, repo 52/0, CLI 163/0, bench 4/0.

Consumer-visible change: yes (more reports; one false positive removed).

Verified with scripts/ci-local.sh (5684a6b, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
type-declaration-immutability now checks unions, arrays/tuples, mapped types, index signatures and well-known mutable references with ReadonlyShallow semantics; the rebuilt 22-case probe (expected results from upstream eslint-plugin-functional 10.0.1, run for real) passes 22/22 (was 13). README documents limits. Changeset: immutable minor. Verified with scripts/ci-local.sh (5684a6b, PASS).
<!-- SECTION:FINAL_SUMMARY:END -->
