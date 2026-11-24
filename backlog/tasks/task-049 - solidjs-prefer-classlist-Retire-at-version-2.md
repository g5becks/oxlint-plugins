---
id: TASK-049
title: 'solidjs/prefer-classlist: Retire at version 2'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-23T20:29:00Z'
updated_date: '2026-11-23T21:17:00Z'
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
type: chore
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`prefer-classlist` (already deprecated, off in recommended) reports nothing at version 2. `classList` is removed in 2.0, and the compiler rejects it on native elements (MIGRATION §classList → class; RFC 07 §Enhanced class prop). Its docs point to no-classlist. Version 1 is unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples (a version-2 file that version 1 reports is valid)
- [x] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged
- [x] #3 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [x] #4 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Version 2: before() returns false (the file is skipped). CLI: tests/cli/fixtures/solidjs-v2/prefer-classlist.tsx (no marks: nothing reported at version 2). Version 1: all-rules diff vs the 2fd695f build 71 = 71, 20 = 20; gate PASS. Changeset is a patch (a deprecated, off-by-default rule going quiet at an opt-in setting).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
prefer-classlist reports nothing at settings.solidjs.version 2 (classList is removed in 2.0); docs point to no-classlist. Version 1 unchanged.
<!-- SECTION:FINAL_SUMMARY:END -->
