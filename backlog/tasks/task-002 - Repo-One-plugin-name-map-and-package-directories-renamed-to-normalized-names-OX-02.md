---
id: TASK-002
title: >-
  Repo: One plugin-name map and package directories renamed to normalized names
  (OX-02)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T16:50:00Z'
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
- [x] #1 Package directories are packages/{errorset,immutable,ts-no-assert,query,router,solidjs}; git log --follow shows history
- [x] #2 A single name map is used by the build and the tests; grep finds no hard-coded oxlint-plugin-solid, oxlint-plugin-functional, plugin-functional, plugin-no-type-assertion or plugin-solid outside the map and historical docs
- [x] #3 bun run build emits six bundles whose contents equal the pre-rename build (diff recorded)
- [x] #4 Every check that was green when the task started is still green (frozen install, typecheck, unit, ESLint-compat, CLI and bench suites as they exist at the time); commands and results are recorded in the notes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. git mv packages/plugin-* to packages/{errorset,immutable,ts-no-assert,query,router,solidjs}.
2. Add scripts/plugins.ts: the single name map (dir, package name, normalized name, legacy dir) with helpers (packageDir, ruleKey, diagnostic prefix).
3. scripts/build.ts iterates the map (same `bun build --target node --format esm` invocation); package.json build/test scripts use the new dirs.
4. Update tsconfig references, root .oxlintrc.json, integration/compat imports, CLI runner + CLI/bench configs to derive names from the map.
5. Diff bundles against the pre-rename build; run all gates.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- `git mv` packages/plugin-{errorset,functional,no-type-assertion,query,router,solid} -> packages/{errorset,immutable,ts-no-assert,query,router,solidjs}. Staged diff: 216 files R100 (pure renames), so `git log --follow` tracks them.
- scripts/plugins.ts is the single name map: PLUGIN_NAMES, PLUGINS[name] = {name (normalized >= 1.70 prefix = dir name), packageName (= meta.name), legacyDir}, plus packageDir/entryPoint/distEntry/ruleKey helpers.
- scripts/build.ts iterates the map and runs the same `bun build <entry> --outdir <pkg>/dist --target node --format esm`; `bun run build` calls it (optional plugin names as args). package.json scripts collapsed to build, test, test:unit (`./packages/*/tests/*.test.ts`), test:compat, test:cli, test:bench, check.
- tsconfig references, root .oxlintrc.json jsPlugins paths, client/.oxlintrc.json paths (client/ copy, removed in TASK-021), integration/eslint-compat imports updated.
- CLI runner imports PLUGIN_NAMES/PluginName/entryPoint from the map and builds every mapped plugin to dist/<name>/; CLI/bench configs use normalized keys (`immutable/no-let`, `solidjs/...`); tests/cli/{functional,solid}.cli.test.ts and their fixtures renamed to immutable/solidjs; diagnostic-code assertions derive from `PLUGINS[PLUGIN].packageName` (normalizing them for >= 1.70 codes is TASK-004).
- No meta.name, rule or preset changed.

## Verification
- Bundles vs pre-rename build (saved to oxlint-plugins-release/logs/task-002-prebuild/): the only differing lines are bun's `// packages/<dir>/src/...` path comments (errorset 16, immutable 24, ts-no-assert 4, query 24, router 12, solidjs 50 changed lines, 0 outside those comments); after mapping old dir names to new ones in the pre-rename bundles, `cmp` reports all six identical.
- `bun install` rewrote only the workspace paths in bun.lock; `bun install --frozen-lockfile` -> no changes.
- `bun run test:unit` 129 pass / 0 fail; `bun run test:compat` 19 / 0 (both = baseline).
- `bun run check`: 339 errors (= baseline; TASK-003).
- `bun run test:cli` on pinned 1.93.0: 51 pass / 53 fail (was 15 / 89). None of the 15 previously passing tests regressed (sorted pass-list comparison against the TASK-001 temp copy). All 53 failures are code-filter assertions (`Received length: 0`): oxlint >= 1.70 emits `immutable(no-let)`, tests still expect `oxlint-plugin-immutable(no-let)` -> TASK-004.
- `bun run test:bench`: 4 pass / 0 fail (was 0 / 4).
- `git grep -nE "oxlint-plugin-solid\b|oxlint-plugin-functional|(^|[^-])plugin-functional|plugin-no-type-assertion|(^|[^-])\bplugin-solid\b"` outside scripts/plugins.ts and historical docs (.clavix/, audit, backlog/): only the upstream name `eslint-plugin-no-type-assertion` in ts-no-assert README/package.json description (a legitimate upstream reference).

Consumer-visible change: none (package names, meta.name and bundle code unchanged).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Package directories renamed to normalized names (pure git renames), one name map (scripts/plugins.ts) drives the build script, CLI runner and test configs; bundles identical apart from path comments; CLI 51/104 (from 15), bench 4/4 (from 0), unit/compat unchanged.
<!-- SECTION:FINAL_SUMMARY:END -->
