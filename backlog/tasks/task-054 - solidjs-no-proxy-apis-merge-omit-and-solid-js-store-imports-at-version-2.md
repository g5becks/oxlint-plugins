---
id: TASK-054
title: 'solidjs/no-proxy-apis: merge/omit and solid-js store imports at version 2'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-23T20:29:00Z'
updated_date: '2026-11-23T21:37:00Z'
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
- [x] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [x] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged
- [x] #3 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [x] #4 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Correction to the plan (checked in the shipped @solidjs/signals 2.0.3 dev build): merge() and omit() create a Proxy view only when Proxy exists (SUPPORTS_PROXY = typeof Proxy === "function") and otherwise fall back to an eager copy; merge turns a function source into a memo, which the copy path can't read. Stores have no fallback. So version 2 reports store APIs imported from solid-js and function/non-props sources of merge, and does NOT report omit. Version 1 all-rules diff 71 = 71, 19 = 19; upstream 468/468; gate PASS.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
no-proxy-apis at version 2: store APIs imported from solid-js (noStoreV2) and function/non-props sources of merge (mergeV2); omit not reported (copy fallback in 2.0.3). Docs: packages/solidjs/docs/rules/no-proxy-apis.md.
<!-- SECTION:FINAL_SUMMARY:END -->
