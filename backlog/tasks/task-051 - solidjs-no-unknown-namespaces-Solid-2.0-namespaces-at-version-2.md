---
id: TASK-051
title: 'solidjs/no-unknown-namespaces: Solid 2.0 namespaces at version 2'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-23T20:29:00Z'
updated_date: '2026-11-23T21:24:00Z'
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
- [x] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [x] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged
- [x] #3 One fixture per removed namespace with its message and suggestion; prop:, xmlns:, xlink:, xml: valid
- [x] #4 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [x] #5 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Version 2: prop:, xmlns:, xlink:, xml: allowed. removedOn (suggestion on:x -> camelCase via event-handlers' COMMON_EVENTS_MAP, now exported; none for oncapture:), removedAttr (suggestion to the plain name), removedUse (suggestion ref={x(v)} / ref={x}; none when a ref exists), style kept, unknownV2. Components unchanged. agentx client at version 2: 0 reports (agentx-pm's plan: no use:, on:). Version 1: all-rules diff 71 = 71, 20 = 20; upstream 462/462; gate PASS.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
no-unknown-namespaces at version 2 allows only prop: and the XML namespaces, and reports on:/oncapture:/attr:/bool:/use: with their 2.0 replacement and suggestions. Docs: packages/solidjs/docs/rules/no-unknown-namespaces.md.
<!-- SECTION:FINAL_SUMMARY:END -->
