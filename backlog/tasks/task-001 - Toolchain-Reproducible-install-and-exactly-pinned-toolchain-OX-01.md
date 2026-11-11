---
id: TASK-001
title: 'Toolchain: Reproducible install and exactly pinned toolchain (OX-01)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T16:47:00Z'
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
- [x] #1 Baseline recorded in the notes before any change (unit, compat, CLI, bench, check error count, bundle sizes)
- [x] #2 bun install --frozen-lockfile succeeds from a clean clone
- [x] #3 Root package.json has no latest, ^ or ~ ranges; oxlint and @oxlint/plugins are pinned to the same exact version; oxlint-tsgolint is removed
- [x] #4 No test or script calls bunx oxlint (grep); tests use node_modules/.bin/oxlint unless OXLINT_BIN is set
- [x] #5 scripts/backlog runs the local backlog.md 1.55.3
- [x] #6 Unit and compat results equal the baseline; bundle size changes are explained in the notes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Record baseline (Appendix B) before any change.
2. Pin root devDependencies exactly (oxlint 1.93.0, @oxlint/plugins 1.93.0, @types/bun 1.4.4, typescript 5.9.3, eslint 9.39.5, @typescript-eslint/* 8.72.2, other existing deps at their locked versions); remove oxlint-tsgolint; add backlog.md 1.55.3.
3. Regenerate bun.lock; verify frozen install from a clean clone.
4. Add tests/helpers oxlint-bin resolver (node_modules/.bin/oxlint, OXLINT_BIN override); replace bunx in cli-runner.
5. Switch scripts/backlog to the local binary.
6. Re-run unit/compat and build; explain bundle size deltas.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Baseline (2026-11-11, before any change; HEAD 4aa4675, Bun 1.4.4, Node 26.13.0)
Install: `bun install --frozen-lockfile` FAILS ("eslint was removed in packages/plugin-query"); baseline run used `bun install --ignore-scripts --no-save`.
Unit (bun test, ESLint RuleTester): router 5, query 12, functional 28, solid 20, no-type-assertion 22, errorset 42 = 129 pass / 0 fail.
Integration + eslint-compat: 19 pass / 0 fail.
CLI (tests/cli, 104 tests; run on a temp copy with the runner pointed at an explicitly installed binary instead of bunx): oxlint 1.93.0 15 pass / 89 fail; oxlint 1.70.0 15 pass / 89 fail.
Bench (tests/bench): oxlint 1.93.0 0 pass / 4 fail ("Plugin 'functional' not found" / "Plugin 'solid' not found").
`bun run check` (tsc -b, TS 5.9.3): 339 errors.
Bundle sizes (bun run build): router 14.70 KB, query 33.55 KB, functional 24.99 KB, solid 120.63 KB, ts-no-assert 5.83 KB, errorset 28.91 KB.

## Outcome
- Root package.json: no `dependencies` block; every devDependency pinned exactly: oxlint 1.93.0, @oxlint/plugins 1.93.0, @types/bun 1.4.4, typescript 5.9.3, eslint 9.39.5, @typescript-eslint/parser 8.72.2, @typescript-eslint/utils 8.72.2, backlog.md 1.55.3; estraverse 5.3.0, is-html 2.0.0, kebab-case 1.0.2, known-css-properties 0.30.0, style-to-object 1.0.14 pinned at their previously locked versions. oxlint-tsgolint removed.
- bun.lock regenerated. Changes: @oxlint/plugins 1.43.0 -> 1.93.0; oxlint (+ @oxlint/binding-*) 1.47.0 (transitive, previously via oxlint-tsgolint era lock) -> 1.93.0 direct; @oxlint-tsgolint/* removed; @types/bun/bun-types 1.3.9 -> 1.4.4; @typescript-eslint/* 8.55.0 -> 8.72.2; eslint 9.39.2 -> 9.39.5 (+ @eslint/config-array, @eslint/eslintrc patch bumps); backlog.md 1.55.3 added. The stale "eslint was removed in packages/plugin-query" entry is gone.
- tests/helpers/oxlint-bin.ts: `oxlintBin()` resolves `<repo>/node_modules/.bin/oxlint`, overridable with `OXLINT_BIN` (absolute or cwd-relative); throws a clear error if missing. tests/cli/helpers/cli-runner.ts (runOxlint and the --fix runner) spawn it directly; no `bunx oxlint` remains.
- scripts/backlog now execs `<repo>/node_modules/.bin/backlog` (1.55.3).

## Decisions
- @oxlint/plugins is a root **devDependency**: it is only a build-time input (its eslintCompatPlugin is bundled into each dist/index.js); the six published packages declare no dependencies, and the root package is private.
- oxlint CHANGELOG after 1.92.0: only 1.93.0 (2026-11-09): "linter: Remove unused `oxlint-disable` directives with `--fix` (#27698)" and "linter/disable-directives: Preserve separators and disable spans (#28921)". No JS-plugin API entries; the first is relevant to the suppression migration (TASK-019): `oxlint --fix` on >= 1.93 deletes unused disable directives, which includes stale long-form ones.
- For the 0.2.0 changelog: the bundled ESLint-compat layer moves from @oxlint/plugins 1.43 to 1.93 (picks up the `after`-hook ordering fixes from 1.44/1.58; no rule uses `after` today).
- Runtimes: Bun 1.4.4 for install/build/bun-test suites; Node >= 22.18 needed for the oxlint RuleTester (refuses Bun, TASK-008) with type stripping; oxlint itself needs Node ^20.19.0 || >=22.12.0. To be written into CONTRIBUTING.md in TASK-007.

## Verification
- Frozen install: copied `git ls-files -co --exclude-standard` into a fresh mktemp dir, `bun install --frozen-lockfile` -> "118 packages installed"; node_modules/.bin/oxlint --version = 1.93.0; scripts/backlog --version = 1.55.3.
- `grep -rn bunx tests scripts` -> no oxlint call (only the docs in client/E2E_TESTING.md mention bunx playwright).
- Unit: router 5, query 12, functional 28, solid 20, no-type-assertion 22, errorset 42 = 129 pass / 0 fail (= baseline). Integration+compat 19 / 0 (= baseline).
- CLI on pinned 1.93.0: 15 pass / 89 fail; bench 0 / 4; check 339 errors - all equal to baseline (fixed in TASK-003/004).
- Bundle sizes: router 16.85 KB (+2.15), query 35.69 (+2.14), functional 27.13 (+2.14), solid 122.77 (+2.14), ts-no-assert 7.98 (+2.15), errorset 31.10 (+2.19). The uniform ~2.15 KB growth is the bundled eslintCompatPlugin: @oxlint/plugins index.js is 3,826 B in 1.43.0 vs 13,536 B in 1.93.0 (npm pack of both); nothing else in the bundles changed.

Consumer-visible change: none released yet (the bundled compat layer upgrade ships with 0.2.0; noted above).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reproducible toolchain: lockfile regenerated (frozen install passes), all root devDependencies pinned exactly (oxlint and @oxlint/plugins 1.93.0, @types/bun 1.4.4, TS 5.9.3), oxlint-tsgolint removed, tests resolve node_modules/.bin/oxlint with an OXLINT_BIN override, scripts/backlog uses the local backlog.md 1.55.3. Test results unchanged from baseline; bundles +~2.15 KB from the newer bundled compat layer.
<!-- SECTION:FINAL_SUMMARY:END -->
