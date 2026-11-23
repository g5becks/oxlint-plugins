---
id: TASK-053
title: 'solidjs/prefer-for: For keyed={false} and Repeat instead of Index at version 2'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-23T20:29:00Z'
updated_date: '2026-11-23T21:33:00Z'
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
- [x] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [x] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged
- [x] #3 Fixtures: 1-param map (fixed), 2-param map (new message), each count-based pattern (Repeat suggestion), item param used (no suggestion)
- [x] #4 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [x] #5 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Version 2: 1-param map keeps the For autofix; 2-param map -> preferForV2 (For / For keyed={false}, no Index); count-based lists in JSX -> preferRepeat with a Repeat suggestion (adds the import via ensureSolidImports) when the arrow's item param is unused. agentx client at version 2: 0 reports. Version 1 all-rules diff 71 = 71, 19 = 19; gate PASS.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
prefer-for at version 2: no <Index> advice (preferForV2 names For and For keyed={false}), and preferRepeat for Array.from({length}) / [...Array(n)] / Array(n).fill() maps with a <Repeat count> suggestion. Docs: packages/solidjs/docs/rules/prefer-for.md.
<!-- SECTION:FINAL_SUMMARY:END -->
