---
id: TASK-057
title: >-
  solidjs/for-keyed-literal: Dynamic boolean keyed with function children (Solid
  2.0)
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
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New rule (version 2 only): in `<For keyed={expr}>` with function children, `expr` is a dynamic boolean. The callback's argument shapes depend on the mode, so the guide says to use a literal or a key function (MIGRATION §List rendering; RFC 03 §List rendering notes). The same check applies to `mapArray(list, fn, { keyed: expr })`.

**Reported:** calls (`cond()`), `!x`, comparisons, logical expressions, and conditionals.

**Valid:** `true`/`false`, a bare `keyed`, function expressions, and identifiers traced to a boolean literal or a function. Other identifiers and member expressions aren't reported (they may be key functions).

**Autofix:** none.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [ ] #2 Nothing is reported at version 1
- [ ] #3 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [ ] #4 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->
