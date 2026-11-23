---
id: TASK-058
title: 'solidjs/no-destructure: Generate omit (not splitProps/mergeProps) at version 2'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-23T20:29:00Z'
updated_date: '2026-11-23T21:47:00Z'
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
type: bug
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found while reading the code. agentx-pm §2.8 lists no-destructure as "keep", but its autofix generates `splitProps`/`mergeProps` calls (no-destructure.ts:127-144), which don't exist in 2.0.

At version 2:
- A rest element is fixed with `const rest = omit(props, "a", "b")`, and the picked names are read as `props.a` (as today).
- Defaults aren't autofixed. `merge` treats an explicit `undefined` as a value, while a destructuring default applies to `undefined`, so `merge({ b: 1 }, props)` isn't equivalent (MIGRATION §mergeProps / splitProps → merge / omit; RFC 04 §merge). This is report-only, and the message names merge and the caveat.
- The message stops recommending splitProps.

2.0 itself warns on destructured props (MIGRATION §"Top-level reactive read"). Version 1 is unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [x] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged
- [x] #3 Fixtures: rest only (omit fix), defaults (report only), defaults + rest (report only); fix-safety covers the version-2 fix
- [x] #4 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [x] #5 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Version 2: plain destructuring -> props.x (as 1.x); rest -> const rest = omit(props, ...keys) with the omit import; defaults -> noDestructureDefaults (report only). The idempotence test caught that per-report fixes overlap at the import line (two components -> two runs); at version 2 the file's reports share one combined fix with a single import (version 1 keeps per-report fixes). agentx client at version 2: 0 reports. Version 1 all-rules diff 71 = 71, 19 = 19; upstream 468/468; gate PASS.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
no-destructure at version 2: omit() for rest elements (imported), defaults report-only (merge semantics differ), one combined per-file fix. Docs: packages/solidjs/docs/rules/no-destructure.md.
<!-- SECTION:FINAL_SUMMARY:END -->
