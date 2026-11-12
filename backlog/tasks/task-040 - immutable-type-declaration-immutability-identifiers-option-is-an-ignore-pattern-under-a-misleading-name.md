---
id: TASK-040
title: >-
  immutable/type-declaration-immutability: identifiers option is an ignore
  pattern under a misleading name
status: To Do
assignee: []
created_date: '2026-11-11T23:23:00Z'
labels:
  - immutable
milestone: m-4
dependencies:
  - TASK-027
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found in TASK-027 while mapping options to eslint-plugin-functional 10.0.1. The port's `identifiers` option (string | string[]) skips type declarations whose name matches (shouldCheckName returns !match), which is upstream's `ignoreIdentifierPattern`, while upstream's `rules[].identifiers` selects the types a rule applies to. Undocumented until TASK-027's README table and had no tests. Consider accepting `ignoreIdentifierPattern` and deprecating `identifiers` (breaking only on removal), with tests.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 type-declaration-immutability accepts ignoreIdentifierPattern with upstream semantics, with tests
- [ ] #2 identifiers is deprecated with a migration note, or its behavior is documented as final
<!-- AC:END -->
