---
id: TASK-019
title: >-
  Migration: Codemod for suppressions and config keys, plus the 0.2 migration
  guide (OX-41)
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 Codemod tests cover every comment form, JSON and JSONC configs, untouched jsPlugins entries, idempotence and --check exit codes
- [ ] #2 On a temp copy of agentx the codemod rewrites the long-form suppressions and the three config files; counts are recorded and compared with the audit's 168 in 90 files; /Users/takinprofit/Dev/agentx is unmodified (git status there is unchanged)
- [ ] #3 docs/migration-0.2.md lists every breaking change and the agentx checklist; every README links it
- [ ] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
