---
id: TASK-017
title: 'Presets: Normalized rule prefixes generated from the name map (OX-18, R15)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 Every recommended preset key is <normalized>/<rule>, generated from the name map
- [ ] #2 Each preset loads into oxlint 1.70.0 and the pinned version with no config errors and the expected diagnostics (tests)
- [ ] #3 Each preset works in an ESLint 9 flat config with the plugin registered under its normalized name (test)
- [ ] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
