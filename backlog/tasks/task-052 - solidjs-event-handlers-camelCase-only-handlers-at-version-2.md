---
id: TASK-052
title: 'solidjs/event-handlers: camelCase-only handlers at version 2'
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
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
At version 2, only `on` followed by an uppercase letter is an event handler. A lowercase `on*` is an attribute: a function passed to one is stringified into the attribute and never runs (MIGRATION §Attributes & events; RFC 07; RFC 08 §LOWERCASE_EVENT_ATTRIBUTE, which also covers spreads).

**Reports:**
- A lowercase `on*` on a native element whose value is a function (inline, or an identifier traced to one) → new message `lowercase-handler`. It's reported regardless of `ignoreCase`, which only applies to version-1 naming.
- The same key in an object spread into a native element.
- A string value on a lowercase `on*` is valid: it's the HTML inline-handler attribute.

**Messages:** `detected-attr` and `naming` stop recommending the removed `attr:` prefix. A static string on a camelCase handler name suggests the lowercase attribute instead.

**Autofix:** rename to camelCase (the guide's `onclick` → `onClick`) for the known DOM events (the existing COMMON_EVENTS map). For other names it's a suggestion.

**Preset:** recommended-v2 sets the rule to error, since most of its version-2 reports are runtime bugs. Version 1 is unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [ ] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged
- [ ] #3 Fixtures: the guide's onclick={increment} (fixed), onload="this.rel='stylesheet'" (valid string), unknown lowercase name (suggestion), spread object with a lowercase handler; fix-safety covers it
- [ ] #4 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [ ] #5 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->
