---
id: TASK-025
title: 'Testing: Upstream parity harness in CI (OX-23)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T23:08:00Z'
labels:
  - testing
  - ci
milestone: m-2
dependencies:
  - TASK-024
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit T5 (the method behind R7, R11 and R12). Nothing compares the ports with the original ESLint plugins on real code.

## Implementation
`scripts/parity.ts` runs the upstream ESLint plugins (exact devDependencies: eslint-plugin-solid 0.19.0, @tanstack/eslint-plugin-query 5.107.1, @tanstack/eslint-plugin-router 1.162.0, eslint-plugin-functional 10.0.1, or newer pinned versions; record them) and the ports (through oxlint) over `tests/fixtures/corpus/`, and reports per-rule recall and precision with a site-level diff. Add it to CI and ci-local as an advisory job that writes the report to the logs. Record the first report in the notes and propose thresholds.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 scripts/parity.ts reports per-rule recall and precision against pinned upstream plugins on the corpus
- [x] #2 An advisory parity job runs in ci.yml and ci-local; the first report and proposed thresholds are in the notes
- [x] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Pin upstream plugins exactly (task-listed versions: solid 0.19.0, query 5.107.1, router 1.162.0, functional 10.0.1).
2. scripts/parity.ts: directive-free corpus copy, upstream via ESLint (typescript-eslint project service, per-file with crash isolation), ports via oxlint; per-rule and per-plugin recall/precision + site diff; --out.
3. Advisory parity job in ci.yml (continue-on-error, step summary) and ci-local (advisory leg).
4. Record first report; propose thresholds; file follow-ups for big gaps.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- devDependencies (exact): eslint-plugin-solid 0.19.0, @tanstack/eslint-plugin-query 5.107.1, @tanstack/eslint-plugin-router 1.162.0, eslint-plugin-functional 10.0.1 (the versions the task lists; the 0.14.5 / 5.91.4 behavior the ports follow is covered by the TASK-023/024 suites, so this report measures drift from current upstream).
- scripts/parity.ts (`bun run parity [-- --out file]`): copies tests/fixtures/corpus to a temp dir with every eslint-/oxlint-disable directive blanked (line numbers kept); upstream: ESLint 9 + @typescript-eslint/parser with projectService (a tsconfig is written into the copy), one file at a time; when an upstream rule throws (functional/prefer-immutable-types throws "ErrorType encountered." on unresolved imports) the file is re-linted without it, the crash is listed and that (rule, file) pair is excluded from BOTH sides; ports: built bundles through the pinned oxlint (or OXLINT_BIN). Sites = (rule, file, line). Report: totals, per-plugin and per-rule tables (recall = shared/upstream, precision = shared/port), crash list, per-rule site diff. 36 rule pairs: 20 solidjs, 6 query, router/create-route-property-order, 9 immutable (prefer-immutable-types upstream enforcement ReadonlyShallow; type-declaration-immutability upstream ReadonlyShallow/AtLeast). errorset (no upstream) and ts-no-assert (no upstream listed) are not compared. Always exits 0 (advisory).
- ci.yml: `parity` job, continue-on-error, report appended to the step summary. ci-local: advisory leg "parity (linux)" (report in its log). actionlint clean. CONTRIBUTING lists `bun run parity`.

## First report (2026-11-11, corpus 76 files, oxlint 1.93.0; full report: oxlint-plugins-release/logs/parity-first.md)
Total upstream 1,641, port 4,505, shared 528: recall 32.2%, precision 11.7% (99 rule/file pairs excluded: upstream prefer-immutable-types threw).
Per plugin: solidjs 10 / 24 / 10 (recall 100%, precision 41.7%); query 0 / 0; router 0 / 0 (the corpus has no violations for these rules); immutable 1,631 / 4,481 / 518 (31.8% / 11.6%).
Non-zero rules: solidjs/no-proxy-apis 1/14/1 (100% / 7.1%); solidjs/prefer-show 6/6/6 (100/100); solidjs/reactivity 3/4/3 (100 / 75: the 0.14.5-vs-0.19.0 makePersisted case, PARITY.md); immutable/no-let 3/3/3; no-throw-statements 5/5/5; no-promise-reject 1/1/1 (all 100/100); immutable-data 43/47/40 (93.0 / 85.1); readonly-type 1,516/679/410 (27.0 / 60.4); prefer-immutable-types 39/3,725/39 (100 / 1.0); type-declaration-immutability 24/21/20 (83.3 / 95.2).
For comparison, the audit (different 111-file corpus, solid/query/router only) measured recall 95%, precision 72%.

## Proposed thresholds (to make the job blocking once stable)
- Per rule with at least 5 upstream sites, solid/query/router: recall >= 95% and precision >= 90%, once TASK-039 (no-proxy-apis) is resolved; reactivity: recall >= 95% (precision limited by the documented 0.14.5 behavior).
- immutable no-let / no-throw-statements / no-promise-reject: >= 95% / 95%; immutable-data >= 90% / 80%; type-declaration-immutability >= 80% / 90% (syntactic port vs type-aware upstream).
- readonly-type and prefer-immutable-types: informational until TASK-038 / TASK-037.
- Totals: informational (dominated by the immutable type-aware rules).

## Follow-ups created (milestone m-4 "After 0.3.0: Parity follow-ups", depend on task-025)
TASK-037 immutable/prefer-immutable-types precision; TASK-038 immutable/readonly-type parity; TASK-039 solidjs/no-proxy-apis extra reports.

## Verification
`bun run gate` exit 0 (unit 277/0, upstream 1461+465 pass, compat 40/0, repo 52/0, CLI 164/0, bench 4/0).

Consumer-visible change: none (tooling).

Verified with scripts/ci-local.sh (6cdef78, PASS; 15 legs incl. the advisory parity leg, whose Linux report matches the local one exactly); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
scripts/parity.ts compares pinned upstream ESLint plugins with the ports on the corpus (per-rule/per-plugin recall and precision, site diff, crash-isolated); advisory job in ci.yml and ci-local; first report and proposed thresholds in notes; follow-ups TASK-037..039 for the immutable and no-proxy-apis gaps. Verified with scripts/ci-local.sh (6cdef78, PASS).
<!-- SECTION:FINAL_SUMMARY:END -->
