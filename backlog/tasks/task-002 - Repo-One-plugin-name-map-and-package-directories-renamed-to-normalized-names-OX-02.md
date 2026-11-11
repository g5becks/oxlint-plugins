---
id: TASK-002
title: >-
  Repo: One plugin-name map and package directories renamed to normalized names
  (OX-02)
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - toolchain
  - testing
milestone: m-0
dependencies:
  - TASK-001
documentation:
  - oxlint-plugins-audit.md
priority: high
type: chore
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit H15 and T4. Directory names differ from package names (`plugin-functional` is `oxlint-plugin-immutable`, `plugin-no-type-assertion` is `oxlint-plugin-ts-no-assert`, `plugin-solid` is `oxlint-plugin-solidjs`). Hard-coded leftover names (`oxlint-plugin-solid`, `oxlint-plugin-functional`) caused 73 CLI failures and the bench failures. The repo's own `.oxlintrc.json` still points at the old paths and long names.

## Implementation
1. `git mv` the package directories to their normalized (oxlint >= 1.70) names: `packages/errorset`, `packages/immutable`, `packages/ts-no-assert`, `packages/query`, `packages/router`, `packages/solidjs`. Keep history (`git log --follow`).
2. Add one name map module (for example `scripts/plugins.ts`) with, per plugin: directory, npm package name, normalized name (the >= 1.70 prefix) and the rule list or a loader. Build, tests and (later) presets import it.
3. Replace the six `build:*` scripts with one build script that iterates the map; keep `bun build --target node --format esm` output identical.
4. Update tsconfig references, test paths, root `.oxlintrc.json`, and scripts.
5. Don't change any plugin's `meta.name` or rule behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Package directories are packages/{errorset,immutable,ts-no-assert,query,router,solidjs}; git log --follow shows history
- [ ] #2 A single name map is used by the build and the tests; grep finds no hard-coded oxlint-plugin-solid, oxlint-plugin-functional, plugin-functional, plugin-no-type-assertion or plugin-solid outside the map and historical docs
- [ ] #3 bun run build emits six bundles whose contents equal the pre-rename build (diff recorded)
- [ ] #4 Every check that was green when the task started is still green (frozen install, typecheck, unit, ESLint-compat, CLI and bench suites as they exist at the time); commands and results are recorded in the notes
<!-- AC:END -->
