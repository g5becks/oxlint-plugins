---
id: TASK-051
title: 'solidjs/no-unknown-namespaces: Solid 2.0 namespaces at version 2'
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
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
At version 2, `no-unknown-namespaces` allows only `prop:` and the XML namespaces `xmlns:`, `xlink:` and `xml:`, plus `allowedNamespaces`. The removed ones report the 2.0 replacement (MIGRATION §Attributes & events; RFC 07 §Follow HTML standards by default, §Directives via ref; §Removals table):
- `on:x`/`oncapture:x` → a camelCase `onX` handler, or for listener options a ref callback calling addEventListener;
- `attr:x`/`bool:x` → the plain attribute (booleans are presence/absence);
- `use:x` → `ref={x(opts)}` (an array to compose);
- `class:`/`style:` → `class`/`style` object values (the existing `style` message).

**Suggestions, not autofixes** (a behavior change, so a person checks): `on:click` → `onClick` (native listener → delegated handler); `attr:x`/`bool:x` → `x`; `use:x={v}` → `ref={x(v)}`.

Component namespaced props keep their version-1 handling. At version 1 the rule is unchanged (`xml:` stays as today).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [ ] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged
- [ ] #3 One fixture per removed namespace with its message and suggestion; prop:, xmlns:, xlink:, xml: valid
- [ ] #4 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [ ] #5 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->
