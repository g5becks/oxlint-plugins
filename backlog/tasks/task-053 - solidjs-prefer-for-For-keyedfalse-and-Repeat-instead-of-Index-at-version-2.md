---
id: TASK-053
title: 'solidjs/prefer-for: For keyed={false} and Repeat instead of Index at version 2'
status: To Do
assignee: []
created_date: '2026-11-23T20:29:00Z'
labels:
  - solidjs
  - solid2
milestone: m-5
dependencies:
  - TASK-043
references:
  - >-
    https://github.com/solidjs/solid/blob/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0/MIGRATION.md
priority: low
type: feature
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
At version 2, `prefer-for` never suggests `<Index>`, which is removed (RFC 03 §Index → For keyed={false}).

- A one-parameter `.map` keeps its autofix to `<For each>`: default For passes the raw item and an index accessor, as in 1.x (RFC 03 §List rendering).
- A two-parameter `.map` is report-only. The message names `<For>` (index becomes the accessor `i()`) and `<For keyed={false}>` (item becomes an accessor, index a number); neither is a drop-in for `(item, i: number)`.
- New `preferRepeat` for count-based lists in JSX: `Array.from({ length: n }, fn)`, `Array.from({ length: n }).map(fn)`, `[...Array(n)].map(fn)`, `Array(n).fill(x).map(fn)` and `new Array(n)…`. The suggestion is `<Repeat count={n}>{(i) => …}</Repeat>`, offered when the item parameter is unused: Repeat passes a plain-number index (RFC 03 §Range/count rendering: Repeat; MIGRATION §New in 2.0).

Version 1 is unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [ ] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged
- [ ] #3 Fixtures: 1-param map (fixed), 2-param map (new message), each count-based pattern (Repeat suggestion), item param used (no suggestion)
- [ ] #4 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [ ] #5 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->
