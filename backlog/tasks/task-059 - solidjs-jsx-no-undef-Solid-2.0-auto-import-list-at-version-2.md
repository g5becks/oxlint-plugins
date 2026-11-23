---
id: TASK-059
title: 'solidjs/jsx-no-undef: Solid 2.0 auto-import list at version 2'
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
type: bug
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found while reading the code: `jsx-no-undef` auto-imports `Show`, `For`, `Index`, `Switch` and `Match` from solid-js (jsx-no-undef.ts:7). At version 2, an undefined `<Index>` would get an import that doesn't exist.

The version-2 auto-import list is Show, For, Switch, Match, Loading, Errored, Repeat and Reveal (RFC 03; solid-js 2.0.3 `types/client/flow.d.ts`). Version 1 is unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [ ] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged
- [ ] #3 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->
