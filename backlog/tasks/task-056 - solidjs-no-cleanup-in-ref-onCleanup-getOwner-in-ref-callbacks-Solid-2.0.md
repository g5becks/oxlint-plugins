---
id: TASK-056
title: 'solidjs/no-cleanup-in-ref: onCleanup/getOwner in ref callbacks (Solid 2.0)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-23T20:29:00Z'
updated_date: '2026-11-23T21:42:00Z'
labels:
  - solidjs
  - solid2
milestone: m-5
dependencies:
  - TASK-043
references:
  - >-
    https://github.com/solidjs/solid/blob/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0/MIGRATION.md
priority: medium
type: feature
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New rule (version 2 only): ref callbacks are unowned in 2.0, and `getOwner()` is null inside them (MIGRATION §Ref callbacks: no longer owned; RFC 07 §Two-phase directive factories).

The rule checks inline functions in `ref={…}` and inside `ref={[…]}` arrays, on any element. It reports:
- `onCleanup` (throws CLEANUP_IN_FORBIDDEN_SCOPE, RFC 08);
- `getOwner()` (returns null);
- **proposed:** primitives (`create*`) and `onSettled`. With no owner they're never disposed (RFC 08 §NO_OWNER_EFFECT; RFC 07: "No new primitives should be created in this callback").

Only the callback's own body and its synchronous callbacks count. Returned directive-factory callbacks aren't followed.

**Autofix:** none. The fix is to move the work into `onSettled` in the component body, or into a directive factory's setup half (MIGRATION shows both).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [x] #2 Fixtures: the guide's 1.x ref-with-onCleanup (reported) and both 2.0 rewrites (onSettled, directive factory: valid), ref arrays, nested deferred function (valid)
- [x] #3 Nothing is reported at version 1
- [x] #4 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [x] #5 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Decision from agentx-pm (plan review, item c): include primitives (create*) and onSettled created in ref callbacks (no owner: never disposed).

walkOwnBody moved from effect-split into utils/walk.ts and shared (effect-split unchanged: 43/43). Also fixed V2_ONLY_RULES in the version-2 CLI suite (reconcile-key had been missing; see TASK-055 notes). agentx client at version 2: 0 reports. Version 1 all-rules diff 71 = 71, 19 = 19; gate PASS.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
New rule no-cleanup-in-ref (version 2 only, error in recommended-v2): onCleanup (throws), getOwner() (null), and primitives/onSettled (never disposed) in ref callbacks and ref arrays, own body plus in-place callbacks. Docs: packages/solidjs/docs/rules/no-cleanup-in-ref.md.
<!-- SECTION:FINAL_SUMMARY:END -->
