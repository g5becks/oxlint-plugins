---
id: TASK-049
title: 'solidjs/prefer-classlist: Retire at version 2'
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
type: chore
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`prefer-classlist` (already deprecated, off in recommended) reports nothing at version 2. `classList` is removed in 2.0, and the compiler rejects it on native elements (MIGRATION §classList → class; RFC 07 §Enhanced class prop). Its docs point to no-classlist. Version 1 is unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples (a version-2 file that version 1 reports is valid)
- [ ] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged
- [ ] #3 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [ ] #4 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->
