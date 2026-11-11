---
id: TASK-001
title: 'Toolchain: Reproducible install and exactly pinned toolchain (OX-01)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - toolchain
milestone: m-0
dependencies: []
documentation:
  - oxlint-plugins-audit.md
priority: high
type: chore
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit H1, H2, H11. `bun install --frozen-lockfile` fails ("eslint was removed in packages/plugin-query"). `@oxlint/plugins` is `latest` (locked 1.43.0) and its `eslintCompatPlugin` is bundled into every `dist/index.js`. `@types/bun` is `latest`. The CLI and bench suites run `bunx oxlint`, so they test whatever oxlint is newest on npm (`tests/cli/helpers/cli-runner.ts:84-92`). `oxlint-tsgolint` is unused.

## Implementation
1. **Record a baseline first** (in the notes, before changing anything): rerun the audit's Appendix B commands and record unit pass counts per plugin, integration/compat counts, CLI pass/fail, bench, the `bun run check` error count, and the six bundle sizes. Later tasks compare against it.
2. Regenerate `bun.lock` so `bun install --frozen-lockfile` succeeds. Record what changed.
3. Pin exactly (no `latest`, `^` or `~` in the root package.json):
   - `oxlint`: add as a devDependency at the current latest (1.93.0 on 2026-11-11; re-check with `npm view oxlint version`). Read the oxlint CHANGELOG entries after 1.92.0 and record any that mention JS plugins.
   - `@oxlint/plugins`: the same version as oxlint (1.93.0 exists). It's bundled into each dist, so decide whether it belongs in `devDependencies` (the published packages declare no dependencies); record the decision. The bundled compat layer moves from 1.43 to 1.93, which picks up the `after`-hook ordering fixes; note this for the 0.2.0 changelog.
   - `@types/bun` 1.4.4; `typescript` stays 5.9.x here (TypeScript 7 is a later task); `eslint`, `@typescript-eslint/parser` and `@typescript-eslint/utils` at their current exact versions within the existing majors.
4. Remove `oxlint-tsgolint`.
5. Every test and script uses the pinned binary: resolve `node_modules/.bin/oxlint` from the repo root, overridable with an `OXLINT_BIN` environment variable (the CI version matrix uses it later). No `bunx oxlint` remains.
6. Add `backlog.md` 1.55.3 as an exact devDependency and switch `scripts/backlog` to the local binary.
7. Runtimes: oxlint needs Node `^20.19.0 || >=22.12.0`. Oxlint's `RuleTester` refuses to run under Bun and needs Node >= 22 (verified 2026-11-11). Development therefore needs Bun 1.4.4 and Node >= 22.18 (type stripping). Record this; CONTRIBUTING.md is written in the release-hygiene task.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Baseline recorded in the notes before any change (unit, compat, CLI, bench, check error count, bundle sizes)
- [ ] #2 bun install --frozen-lockfile succeeds from a clean clone
- [ ] #3 Root package.json has no latest, ^ or ~ ranges; oxlint and @oxlint/plugins are pinned to the same exact version; oxlint-tsgolint is removed
- [ ] #4 No test or script calls bunx oxlint (grep); tests use node_modules/.bin/oxlint unless OXLINT_BIN is set
- [ ] #5 scripts/backlog runs the local backlog.md 1.55.3
- [ ] #6 Unit and compat results equal the baseline; bundle size changes are explained in the notes
<!-- AC:END -->
