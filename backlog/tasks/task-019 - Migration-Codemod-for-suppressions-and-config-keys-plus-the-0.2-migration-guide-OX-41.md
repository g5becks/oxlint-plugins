---
id: TASK-019
title: >-
  Migration: Codemod for suppressions and config keys, plus the 0.2 migration
  guide (OX-41)
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T21:09:00Z'
labels:
  - docs
  - compat
milestone: m-1
dependencies:
  - TASK-018
documentation:
  - oxlint-plugins-audit.md
priority: high
type: feature
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit OX-41 and U1. From oxlint 1.70, long-form disable comments (`oxlint-plugin-immutable/no-let`) stop suppressing, and the short form doesn't exist before 1.70, so consumers must rename every suppression and config key in one step. agentx alone had 168 long-form suppressions in 90 files (audit date). The 0.2.0 release ships with a migration guide and a codemod.

## Implementation
1. `scripts/migrate-0.2.ts`, runnable with Node or Bun and without dependencies:
   - rewrites `oxlint-plugin-{immutable,ts-no-assert,errorset,query,router,solidjs}/` to the short prefix in disable comments (`oxlint-disable`, `-next-line`, `-line`, the `eslint-disable*` variants, line and block comments, several rules per comment) and in config rule keys (`.oxlintrc.json`, JSONC with comments);
   - also maps the pre-publish names `oxlint-plugin-functional/` and `oxlint-plugin-solid/`;
   - never rewrites `jsPlugins` entries or package specifiers (only `<package>/<rule>` patterns);
   - `--dry-run` prints a summary; `--check` exits 1 when anything needs migrating; a second run changes nothing.
2. `docs/migration-0.2.md`: every breaking change (minimum oxlint 1.70, renamed preset keys, no-throw fix to suggestion, settings-driven errorset detection producing new reports, peers and engines), codemod usage, and an **agentx checklist for the later agentx migration epic** (not executed here): bump the six plugins; run the codemod; bump oxlint from 1.69.0 to the pinned version in the same commit; add `settings.errorset.modules: ["@agentx/core"]`; remove the stale `eslint-disable functional/...` comment in `client/src/components/ui/button.tsx`; triage new errorset diagnostics at `warn` for one cycle before `error` (audit OX-40 and OX-42).
3. Link the guide from every README.
4. Validate against agentx **without touching it**: copy `/Users/takinprofit/Dev/agentx` (excluding `node_modules` and `.git`) into a temp dir and run the codemod there. Optionally (if a pinned oxlint 1.70+ run is cheap) lint the migrated copy with the 0.2.0 builds.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Codemod tests cover every comment form, JSON and JSONC configs, untouched jsPlugins entries, idempotence and --check exit codes
- [x] #2 On a temp copy of agentx the codemod rewrites the long-form suppressions and the three config files; counts are recorded and compared with the audit's 168 in 90 files; /Users/takinprofit/Dev/agentx is unmodified (git status there is unchanged)
- [x] #3 docs/migration-0.2.md lists every breaking change and the agentx checklist; every README links it
- [x] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. scripts/migrate-0.2.ts (no deps, Node/Bun): directive comments in JS/TS sources; rule keys (object keys only) in .oxlintrc*.json(c); pre-publish names; --dry-run, --check; idempotent.
2. tests/repo/migrate-0.2.test.ts: comment forms, JSON/JSONC, jsPlugins untouched, idempotence, CLI on node and bun with exit codes.
3. agentx validation on a temp copy (independent grep vs codemod counts; agentx git status before/after).
4. docs/migration-0.2.md (breaking changes, codemod, ESLint, settings, agentx checklist); README links; changeset.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- scripts/migrate-0.2.ts: dependency-free, runs under `node` (type stripping, Node >= 22.18) and `bun`. Rewrites `oxlint-plugin-{immutable,ts-no-assert,errorset,query,router,solidjs}/` (and pre-publish `functional` -> immutable, `solid` -> solidjs) to the short prefix (a) inside comments that contain an `oxlint-`/`eslint-` `disable`/`enable` (`-next-line`/`-line`) directive in .js/.jsx/.ts/.tsx/.mjs/.cjs/.mts/.cts files, (b) in `.oxlintrc*.json(c)` files only for strings that are object keys and exactly `oxlint-plugin-<name>/<rule>`. jsPlugins entries (array elements) and package paths are never touched. Skips node_modules/.git/dist/build/coverage. `--dry-run` writes nothing; `--check` exits 1 when anything needs migrating. Documented limitation: the regex comment scanner also rewrites a directive-looking `// ...` inside a string literal (pinned by a test).
- tests/repo/migrate-0.2.test.ts (16): 10 comment forms (next-line, line, block disable/enable, eslint variants, several rules + `--` reason, pre-publish names, multi-line block), non-directive comments / imports / relative paths untouched, JSONC config with jsPlugins entries (name, node_modules path, subpath) and a comment untouched while 5 keys (incl. overrides, spacing before `:`) are rewritten, idempotence for both, CLI on node and bun: --check exit 1 -> --dry-run no write -> rewrite -> --check exit 0 -> rerun "0 ... 0".

## agentx validation (temp copy, never the real repo)
- `/Users/takinprofit/Dev/agentx`: `git status --porcelain` empty and HEAD 2add2ef78d905195f8033a7bb7846cd17360d5fa before and after.
- Copy: `rsync -a --exclude node_modules --exclude .git` into a mktemp dir. Independent grep (directive lines with a long-form prefix in JS/TS sources): 170 lines in 92 files (immutable/no-let 104, ts-no-assert/no-type-assertion 33, immutable/type-declaration-immutability 18, immutable/no-throw-statements 11, solidjs/reactivity 4). Audit (2026-11-08): 168 in 90 (103 / 33 / 18 / 10 / 4): agentx gained 2 suppressions since.
- Codemod: `--dry-run` = "170 suppression(s) in 92 file(s), 53 config key(s) in 3 file(s)" (.oxlintrc.json 11, client/.oxlintrc.json 31, server/.oxlintrc.json 11); `--check` exit 1; run -> same counts; `--check` afterwards exit 0; rerun 0/0; remaining long-form directive lines 0; long-form config keys left 0; client jsPlugins entries (incl. third-party oxlint-plugin-complexity / -inhuman) unchanged. Logs: oxlint-plugins-release/logs/task-019-agentx/.
- Optional lint of the migrated copy skipped: it needs agentx's full dependency install (incl. its third-party plugins); the migration epic will run agentx's own lint tasks.
- Checklist facts re-verified read-only: client/src/components/ui/button.tsx:37 still has `// eslint-disable-next-line functional/type-declaration-immutability`; package.json pins `"oxlint": "1.69.0"`; mise.toml comments about oxlint.

## Docs
- docs/migration-0.2.md: breaking-change table (oxlint >= 1.70 peer, Node, short names + ignored long-form disables, preset prefixes, no-throw suggestion, more errorset reports, fallbacks removed), fixed false positives, codemod usage (curl raw URL; node/bun), ESLint flat config, errorset settings, and the agentx checklist (6 one-commit steps + OX-42 triage at warn).
- All six READMEs link the guide (absolute GitHub URL, so it works on npm).
- Changeset .changeset/migration-guide.md (all six patch: docs).

## Verification
`bun run gate` exit 0: unit 225/0, compat 40/0, repo 52/0, CLI 162/0, bench 4/0.

Consumer-visible change: yes (docs + codemod).
<!-- SECTION:NOTES:END -->
