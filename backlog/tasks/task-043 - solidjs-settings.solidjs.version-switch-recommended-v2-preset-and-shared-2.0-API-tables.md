---
id: TASK-043
title: >-
  solidjs: settings.solidjs.version switch, recommended-v2 preset and shared 2.0
  API tables
status: To Do
assignee: []
created_date: '2026-11-23T20:29:00Z'
labels:
  - solidjs
  - solid2
milestone: m-5
dependencies: []
references:
  - >-
    https://github.com/solidjs/solid/blob/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0/MIGRATION.md
priority: high
type: feature
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Opt-in Solid 2.0 mode. 1.x stays the default.

**Switch:** `settings.solidjs.version: 1 | 2` (default 1), read by `packages/solidjs/src/utils/settings.ts` in the same shape as `settings.errorset` (TASK-012): parsed once per settings object (WeakMap), never throws, any value other than the number 2 means 1. Rules whose behavior differs branch on it. Rules that only make sense on 2.0 (no-removed-apis, effect-split, no-write-in-reactive-scope, reconcile-key, no-cleanup-in-ref, for-keyed-literal, no-classlist) report nothing at version 1: the setting says which Solid the code targets, and nothing is "removed" on 1.x.

**Presets:** `configs.recommended` is unchanged. New `configs["recommended-v2"]` = `{ settings: { solidjs: { version: 2 } }, rules }` for ESLint flat config. oxlint doesn't consume presets, so the README gives the `.oxlintrc.json` block (settings + rules).

**Shared 2.0 tables:** `src/utils/solid2.ts` holds the 2.0 module map, the rename map and the removed-API list, used by imports, no-removed-apis, reactivity and jsx-no-undef, so they can't drift. `trackImports` also recognizes `@solidjs/web` at version 2.

Citations: MIGRATION §Quick checklist, §Imports: where things live now, §Quick rename / removal map; solid-js 2.0.3 `types/index.d.ts` (export list).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 settings.solidjs.version is parsed by a tested helper: absent, 1, 2, and invalid values ("2", 3, null, objects) never throw; anything but 2 is 1
- [ ] #2 configs.recommended is unchanged; configs["recommended-v2"] carries settings.solidjs.version: 2 and the v2 rule set
- [ ] #3 A CLI test proves real oxlint passes .oxlintrc.json settings.solidjs to the plugin (a rule sees version 2), and tests/cli/presets.cli.test.ts also loads recommended-v2
- [ ] #4 src/utils/solid2.ts is the single 2.0 module/rename/removed table, with each entry citing its MIGRATION section
- [ ] #5 README: a Solid 2 section (opt-in for oxlint and ESLint, what changes at version 2, a version column in the rule tables)
- [ ] #6 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged (whole package)
- [ ] #7 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->
