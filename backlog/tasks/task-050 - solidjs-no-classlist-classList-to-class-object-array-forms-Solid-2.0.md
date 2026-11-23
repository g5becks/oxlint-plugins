---
id: TASK-050
title: 'solidjs/no-classlist: classList to class object/array forms (Solid 2.0)'
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
priority: medium
type: feature
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New rule (version 2 only): `classList` on native elements. The prop is removed and merged into `class`, which takes a string, an object or an array (MIGRATION §classList → class (object/array forms); RFC 07 §Enhanced class prop). The compiler rejects classList on native elements (MIGRATION §Attributes & events), so this helps in the editor. On components it's an ordinary prop and isn't reported (same section).

**Autofix** (the guide's exact before/after):
- `classList={{…}}` alone → `class={{…}}`;
- `class="card" classList={{…}}` → `class={["card", {…}]}`;
- `class={expr} classList={x}` → `class={[expr, x]}`.

No fix when the element has a spread (a class may come from it), when there are two classList props, or when the classList has no expression value.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [ ] #2 Fixtures: the guide's example, class string/expression/absent, spread present (report, no fix), component (valid); fix-safety covers the rule
- [ ] #3 Nothing is reported at version 1
- [ ] #4 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [ ] #5 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->
