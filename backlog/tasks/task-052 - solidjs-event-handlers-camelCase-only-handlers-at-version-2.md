---
id: TASK-052
title: 'solidjs/event-handlers: camelCase-only handlers at version 2'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-23T20:29:00Z'
updated_date: '2026-11-23T21:31:00Z'
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
- [x] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [x] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged
- [x] #3 Fixtures: the guide's onclick={increment} (fixed), onload="this.rel='stylesheet'" (valid string), unknown lowercase name (suggestion), spread object with a lowercase handler; fix-safety covers it
- [x] #4 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [x] #5 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Found while testing: utils/trace only looks in the identifier's own scope, so a module-level `const go = () => {}` wasn't seen from a component; isFunctionValue resolves through the scope chain (const + function init, or a function declaration).
fix-safety now runs a rule at both versions when it has a version-1 and a version-2 fixture (event-handlers, imports); before, the version-2 fixture replaced the version-1 one, which had dropped imports' version-1 fix-safety coverage since TASK-048.
agentx client: version 2: 0 reports. Version 1 all-rules diff vs the 2fd695f build: 71 = 71 (fixtures+corpus); agentx 19 = 19 (agentx's source changed since the earlier runs: both bundles moved from 20 to 19). Upstream 468/468 (462 vendored + 6 mechanism); gate PASS.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
event-handlers at version 2: camelCase-only handlers; lowercase on* with a function value (also in spread objects) reported as lowercase-handler (autofix for known events, else suggestion), ambiguous dynamic values get lowercase-ambiguous, strings are valid attributes, no attr: advice. fix-safety covers both versions. Docs: packages/solidjs/docs/rules/event-handlers.md.
<!-- SECTION:FINAL_SUMMARY:END -->
