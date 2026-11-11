---
id: TASK-022
title: >-
  immutable/type-declaration-immutability: Syntactic coverage of mutable shapes
  (OX-20, R7)
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [ ] #2 The 22-case probe matches upstream on at least 21 of 22; readonly x: T[] is accepted
- [ ] #3 The README documents what the rule can't see without type information
- [ ] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
