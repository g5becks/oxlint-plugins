---
id: TASK-021
title: >-
  Housekeeping: Vendored upstream code, the client/ copy, unused
  devDependencies, ESLint 10 (OX-25)
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T21:33:00Z'
labels:
  - toolchain
  - testing
milestone: m-2
dependencies:
  - TASK-020
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit H9, H10 and H12. `client/` is an 80-file copy of the agentx client that no test uses. The vendored `src/upstream/` trees (query 4,495 lines, solid 4,253 lines) are unpinned, unshipped and untested, and are the only users of `estraverse`, `is-html`, `kebab-case`, `known-css-properties`, `style-to-object` and `@typescript-eslint/utils`. ESLint 10 isn't tested.

## Implementation
1. Move the lintable sources from `client/` to `tests/fixtures/corpus/agentx-client/` (drop `public/`, `dev-dist/` and app configs). It becomes the parity and performance corpus.
2. Move vendored upstream code to `vendor/<upstream-package>@<version>/` with a README recording the upstream repo, version, commit and license. Determine which upstream version each port follows by diffing against published packages; record the evidence.
3. Drop devDependencies nothing uses any more (keep what the vendored test suites need in the next tasks).
4. Add ESLint 10 to the compat suite, ci.yml and ci-local.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 client/ is gone; its lintable sources live under tests/fixtures/corpus/ and are used by at least one test or script
- [x] #2 Vendored code lives under vendor/<package>@<version>/ with provenance READMEs; the followed upstream versions are recorded with evidence
- [x] #3 Unused devDependencies are removed (list in notes); ESLint 9 and 10 compat legs run in ci.yml and ci-local
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Determine followed upstream versions by diffing vendored code with published packages / git tags.
2. git mv vendored trees to vendor/<package>@<version>/ in upstream layout (pristine), with LICENSE + provenance README; vendor/README.md.
3. client/ lintable sources -> tests/fixtures/corpus/agentx-client/ (rest deleted); use it in scripts/determinism.ts and a corpus CLI test.
4. Drop devDependencies only vendored code used; ESLint 10 via exact alias + ESLINT_PACKAGE; ci.yml/ci-local legs for ESLint 9 and 10.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Upstream versions (evidence)
- Query port follows **@tanstack/eslint-plugin-query 5.91.4** (commit a678f0957cff5e2cf4efa26dbbeb0747e3bbee6d, tag `@tanstack/eslint-plugin-query@5.91.4`): vendored rules/ + utils/ diffed against npm tarball src/ of 5.91.0 (85 lines), 5.91.2 (43), 5.91.3 (0), 5.91.4 (0), 5.91.5 (201), 5.94.4 (201), 5.95.0 (642), 5.96.0 (642 + 1 file), 5.100.0 (650 + 1), 5.107.1 (1,371 + 1); index.ts/rules.ts/types.ts identical for 5.91.3/5.91.4; the vendored tests diffed against the GitHub tag commits: 5.91.4 all 10 files identical, 5.91.3 differs in no-void-query-fn.test.ts (178 lines).
- Solid port follows **eslint-plugin-solid 0.14.5** (tag v0.14.5, commit 8409ccbe97daec892bd4d753c031030135cd35b7): vendored rules/ vs tag src/rules: v0.14.4 3 lines, v0.14.5 1 line (an added `additionalProperties: false` in jsx-no-duplicate-props, reverted in the vendor copy), v0.15.0 266, v0.16.0 555 (+7 files) ... v0.19.0 1,642 (+17 files); utils.ts/index.ts/plugin.ts/compat.ts/configs identical to v0.14.5. Note: the audit compared behavior against 0.19.0; the source follows 0.14.5 (relevant for TASK-024).
- Router: no vendored copy (create-route-property-order ported from @tanstack/eslint-plugin-router; route-param-names custom).

## Outcome
- `git mv` (history kept) packages/query/src/upstream -> vendor/@tanstack/eslint-plugin-query@5.91.4/src (tests back to upstream names under src/__tests__/*.test.ts), packages/solidjs/src/upstream -> vendor/eslint-plugin-solid@0.14.5/src. Both copies verified byte-identical with upstream (`diff -r`). Each has the upstream LICENSE and a provenance README (repo, version, commit, license, evidence); vendor/README.md indexes them. vendor/ is excluded from lint (.oxlintrc ignorePatterns), Biome and tsconfig; package tsconfigs no longer need the upstream exclude.
- client/: the 76 lintable sources (client/src/**/*.ts|tsx: 18 .ts, 58 .tsx) moved to tests/fixtures/corpus/agentx-client/src/ (git mv); everything else (public/, dev-dist/, app configs, docs, the .css/.md under src) deleted. Used by scripts/determinism.ts (corpus path updated; 1 run: 7176 diagnostics, sha256 b238be596d8eb1f6) and the new tests/cli/corpus.cli.test.ts (every rule of all six plugins over the 76 files: no "Error running JS plugin", numberOfFiles 76).
- devDependencies removed (only vendored code imported them; python scan of all tracked non-vendor sources: 0 importers): estraverse, is-html, kebab-case, known-css-properties, style-to-object, @typescript-eslint/utils. Kept: eslint, @typescript-eslint/parser (compat suites). The vendored query tests need @typescript-eslint/rule-tester, vitest and combinate (not installed); TASK-023 adds what its approach needs.
- ESLint 10: devDependency `eslint-10` = `npm:eslint@10.14.0` (exact alias); tests/helpers/eslint.ts loads `ESLINT_PACKAGE ?? "eslint"` and registers RuleTester describe/it with bun:test (otherwise a dynamic import runs RuleTester cases inline: 24 instead of 40 reported tests). Scripts test:compat (9.39.5) and test:compat:eslint10 (10.14.0): 40/0 each. ci.yml eslint-compat job is a matrix {9, 10}; ci-local has both legs; actionlint clean. CONTRIBUTING updated.

## Verification
- Bundles byte-identical to before the task (cmp, all six).
- `bun run gate` exit 0: unit 225/0, compat 40/0, repo 52/0, CLI 163/0, bench 4/0; frozen install OK.

Consumer-visible change: none.
<!-- SECTION:NOTES:END -->
