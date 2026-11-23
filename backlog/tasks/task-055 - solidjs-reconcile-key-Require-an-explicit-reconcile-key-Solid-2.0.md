---
id: TASK-055
title: 'solidjs/reconcile-key: Require an explicit reconcile key (Solid 2.0)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-23T20:29:00Z'
updated_date: '2026-11-23T21:39:00Z'
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
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New rule (version 2 only).

**Missing key:** `reconcile(value)` with no key. The key defaults to `"id"` (RFC 04 §reconcile(value, key?); solid-js 2.0.3 store/index.d.ts `reconcile(value, key?)`), which silently mismatches data keyed by something else (agentx's `_id`, StrategyBuilderSheet.tsx:478-517). It's report-only, with two suggestions: `reconcile(value, "id")`, which makes today's default explicit and is behavior-preserving, and `reconcile(value, null)` for positional matching. The key is a data decision, so it isn't autofixed.

**1.x options object:** `reconcile(value, { key: "x" })` becomes `reconcile(value, "x")` (autofix; merge semantics are always on in 2.0, same section). With `merge: false`, or a non-literal options object, it's report-only.

Only `reconcile` imported from solid-js (or solid-js/store) is checked.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [x] #2 Fixtures: the RFC's draft-setter examples, missing key (both suggestions), { key } object (fixed), { merge: false } (report only)
- [x] #3 Nothing is reported at version 1
- [x] #4 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [x] #5 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
agentx client at version 2: 3 reports, StrategyBuilderSheet.tsx:478, :487, :517: the _id-keyed reconcile calls agentx-pm's plan (§4.6) named. Version 1 all-rules diff 71 = 71, 19 = 19; gate PASS.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
New rule reconcile-key (version 2 only, warn in recommended-v2): missingKey with "id"/null suggestions, the 1.x { key } options object autofixed to the key argument, merge: false reported. Docs: packages/solidjs/docs/rules/reconcile-key.md.
<!-- SECTION:FINAL_SUMMARY:END -->
