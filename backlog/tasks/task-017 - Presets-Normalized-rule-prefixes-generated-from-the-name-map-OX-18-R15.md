---
id: TASK-017
title: 'Presets: Normalized rule prefixes generated from the name map (OX-18, R15)'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T20:56:00Z'
labels:
  - release
  - compat
milestone: m-1
dependencies:
  - TASK-016
documentation:
  - oxlint-plugins-audit.md
priority: high
type: bug
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R15 (High). All 39 `configs.recommended` entries use prefixes that match neither the plugin's `meta.name` nor its normalized name (`functional/no-let`, `no-type-assertion/no-type-assertion`, ...), so the presets are unusable in oxlint and only work in ESLint by coincidence.

## Implementation
1. Generate preset keys from the name map: `<normalized>/<rule>` (`immutable/...`, `ts-no-assert/...`, `errorset/...`, `query/...`, `router/...`, `solidjs/...`).
2. Oxlint test: for each plugin, an `.oxlintrc.json` with `jsPlugins` and the preset's rules lints a fixture on oxlint 1.70.0 and the pinned version with zero config errors and the expected diagnostics.
3. ESLint test (compat suite): flat config registering the plugin under its normalized name and spreading the preset.
4. Update README usage examples.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every recommended preset key is <normalized>/<rule>, generated from the name map
- [x] #2 Each preset loads into oxlint 1.70.0 and the pinned version with no config errors and the expected diagnostics (tests)
- [x] #3 Each preset works in an ESLint 9 flat config with the plugin registered under its normalized name (test)
- [x] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. scripts/generate-plugin-meta.ts: packages/<name>/src/plugin-meta.ts (PLUGIN_NAME, PACKAGE_NAME, presetRules) from scripts/plugins.ts; --check mode.
2. index.ts x6: meta.name = PACKAGE_NAME; configs.recommended.rules = presetRules({ unprefixed }); errorset to the common shape.
3. Tests: repo (generated files fresh, meta.name, keys = <name>/<existing rule>); CLI (preset loads in oxlint, severities, every enabled rule with a fixture reports) on pinned and 1.70.0; ESLint flat config spreading the preset.
4. README examples; changesets.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- scripts/generate-plugin-meta.ts writes packages/<name>/src/plugin-meta.ts from the name map: `PLUGIN_NAME` (normalized), `PACKAGE_NAME`, `presetRules(rules)` which prefixes keys with `${PLUGIN_NAME}/`. All six index.ts use `meta: { name: PACKAGE_NAME }` and `rules: presetRules({ "<rule>": ... })`; errorset now has the same shape as the others (plugin object + eslintCompatPlugin(plugin)) instead of spreading.
- Preset keys now: immutable/* (was functional/*), ts-no-assert/no-type-assertion (was no-type-assertion/...), solidjs/* (was solid/*); errorset/*, query/*, router/* unchanged in value (they already equalled the normalized names; the audit's "all 39 entries wrong" holds only for the first three plugins on oxlint >= 1.70).

## Tests
- tests/repo/plugin-meta.test.ts (18): generated files equal `pluginMetaSource()`, meta.name = packageName, every recommended key is `<name>/<rule in plugin.rules>`.
- tests/cli/presets.cli.test.ts (6): per plugin, jsPlugins + the preset's rules lint tests/cli/fixtures/<name>/*.ts(x): stderr empty (no config/schema errors), every diagnostic belongs to an enabled preset rule with the preset's severity (error/warning), and each enabled rule that has its own fixture reports on it. Pinned 1.93.0: 6/0; OXLINT_BIN=1.70.0: 6/0. The same test against HEAD's old presets: 3 fail ("Plugin 'functional' not found", "Plugin 'no-type-assertion' not found", "Plugin 'solid' not found").
- tests/eslint-compat/flat-config.test.ts (+6): each plugin registered under its normalized name with `rules: plugin.configs.recommended.rules` lints the invalid sample with no fatal/"Definition for rule" messages and only `<name>/...` rule ids.

## Docs
All six READMEs: rule keys in examples use normalized prefixes; ESLint examples register the plugin under its normalized name (`immutable`, `solidjs`, `ts-no-assert`). errorset README no longer shows a duplicated "recommended config" JSON block; it explains that oxlint can't load a JS plugin's preset directly.

## Changesets
- .changeset/presets-normalized-prefixes.md: immutable, ts-no-assert, solidjs **minor** (breaking preset prefixes) with ESLint migration snippet.
- .changeset/presets-docs.md: errorset, query, router patch (docs; presets unchanged in value, now generated and tested).

## Verification
`bun run gate` exit 0: check, lint, unit 225/0, compat 40/0, repo 36/0, CLI 162/0, bench 4/0.

Consumer-visible change: yes (breaking for three presets).
<!-- SECTION:NOTES:END -->
