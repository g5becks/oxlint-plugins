---
id: TASK-009
title: >-
  solidjs/jsx-no-undef: Reset per-file state; no cross-file reports or fixes
  (OX-11, R9)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T19:56:00Z'
labels:
  - solidjs
  - bug
milestone: m-1
dependencies:
  - TASK-008
documentation:
  - oxlint-plugins-audit.md
priority: high
type: bug
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R9 (Critical). `missingComponentsSet` (`jsx-no-undef.ts:118`) is created once per worker in `createOnce`, filled in `checkIdentifierInJSX`, read in `Program:exit` and never cleared. After one file misses an import, every later file in that worker reports "'Show' should be imported from 'solid-js'.", including `.ts` files without JSX, and the report carries a fix that inserts the import. Three identical runs produced 37, 434 and 251 spurious reports. The leak also happens under ESLint.

## Implementation
1. Commit the Appendix A probe (`a.tsx` with `<Show>` and no import, plus five clean files, `--threads 1`) as a failing test using the state-isolation harness.
2. Reset all per-file state in `before()`.
3. Determinism: lint the corpus (the repo fixtures plus `client/`) three times multi-threaded and compare normalized outputs.
4. Fix safety: `oxlint --fix` over [invalid, valid x5] changes only the invalid file.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [x] #2 Three multi-threaded corpus runs produce identical normalized output (hashes recorded)
- [x] #3 oxlint --fix over one invalid and five valid files changes only the invalid file (test)
- [x] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [x] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Probe already committed as failing (c75f044 test.failing TASK-009; on the harness since b4d5093). Add fix-safety CLI test and an ESLint regression; record they fail.
2. Reset missingComponentsSet in before(); un-mark the probe.
3. Determinism: 3 multi-threaded corpus runs before/after, hashes.
4. Changeset (solidjs patch).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Failing first
- Appendix A probe (a.tsx with <Show> and no import + b1..b5.tsx clean, --threads 1) committed as `test.failing("TASK-009: ...")` in c75f044 (TASK-004), moved onto lintSequence in b4d5093 (TASK-008). Run as a normal test before the fix: reported files = a.tsx, b1..b5 (expected only a.tsx).
- New in this task, run before the fix: CLI "--fix over one invalid and five valid files changes only the invalid file" FAILED (changed = a.tsx, b1..b5); ESLint flat-config "a clean file after an invalid one is not reported" FAILED (clean file got 1 report): the leak also happens through eslintCompatPlugin.

## Fix
`before() { missingComponentsSet.clear(); }` in jsx-no-undef's createOnce visitor (the only closure state in the rule). Marker removed; all three tests pass: CLI solidjs suite 45/0, compat 14/0, unit solidjs 20/0.

## Determinism (scripts/determinism.ts, committed: builds all plugins, lints tests/cli/fixtures + tests/bench/fixtures + client/src with every rule of all six plugins, default threads, 3 runs, sha256 of sorted normalized diagnostics)
- Before (d7f4dd1): run 1 7245 diagnostics / jsx-no-undef 79 / 8c2260b1f5aa3c36; run 2 7196 / 30 / 61d1694fd8ba7127; run 3 7184 / 18 / 84eb868aba242e12 (nondeterministic).
- After: runs 1-3 all 7173 diagnostics / jsx-no-undef 7 / 162a9e34ef36396e (identical).

## Verification
- `bun run gate` exit 0: unit 129/0, compat 33/0, repo 14/0, CLI 122/0, bench 4/0. Remaining test.failing markers: TASK-011, TASK-012 only.
- Changeset .changeset/solidjs-jsx-no-undef-state.md (oxlint-plugin-solidjs: patch; bug fix, not breaking).

Consumer-visible change: yes (jsx-no-undef no longer reports/fixes unrelated files).

## ci-local (ae6dbc7), with network retries
- Attempt 1: RESULT: FAIL, only pack (linux) failed: `error: failed to download typescript@5.9.3: DNSResolveFailed` during bun install in the container (all other 12 legs passed).
- Attempt 2 (after 2 min): RESULT: FAIL, 9 Linux legs failed, every one with `DNSResolveFailed` during `bun install` (e.g. @eslint/config-array, json-buffer, optionator, cross-spawn); macOS legs passed. Single DNS lookups inside a container succeeded 5/5 right after, so the failures were intermittent (Colima DNS under parallel install load).
- Attempt 3 (after 5 more min): RESULT: PASS, all 13 legs pass.
Verified with scripts/ci-local.sh (ae6dbc7, PASS on the third attempt; the first two failed only on DNS errors in Docker); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
jsx-no-undef resets its per-file state in before(): the R9 probe, a --fix safety test and an ESLint regression went from failing to passing, and three multi-threaded corpus runs are now identical (were 79/30/18 spurious-ish reports with different hashes). Changeset: solidjs patch. Verified with scripts/ci-local.sh (ae6dbc7, PASS; 3rd attempt after DNS-only failures).
<!-- SECTION:FINAL_SUMMARY:END -->
