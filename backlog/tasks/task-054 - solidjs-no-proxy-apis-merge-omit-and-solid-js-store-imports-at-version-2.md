---
id: TASK-054
title: 'solidjs/no-proxy-apis: merge/omit and solid-js store imports at version 2'
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
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
At version 2, `no-proxy-apis` (off by default) follows 2.0's APIs:
- the `mergeProps` check moves to `merge`, and `omit` is reported (it creates a view of the props without the omitted keys; RFC 04 §omit);
- the store check moves from the `solid-js/store` import to imports of the store APIs from `solid-js` (createStore, createProjection, createOptimisticStore);
- `createMutable` is gone (MIGRATION §createMutable / modifyMutable).

Version 1 is unchanged (TASK-039's parity question stays separate).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [ ] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged
- [ ] #3 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [ ] #4 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->
