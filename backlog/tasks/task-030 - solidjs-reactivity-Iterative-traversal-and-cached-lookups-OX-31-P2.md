---
id: TASK-030
title: 'solidjs/reactivity: Iterative traversal and cached lookups (OX-31, P2)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-12T14:15:00Z'
labels:
  - solidjs
  - performance
milestone: m-3
dependencies:
  - TASK-029
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit P2. `reactivity`'s `walkTree` (`reactivity.ts:88-108`) recursively walks `Object.keys(node)` inside visitors: it depends on an undocumented node shape, risks stack exhaustion on deep generated JSX, and re-walks subtrees. `findVariable` (`:53-63`) walks scopes by name on every lookup.

## Implementation
1. Replace `walkTree` with an explicit stack or with information collected in the main visitor pass.
2. Cache variable lookups per identifier.
3. Add a test with very deep generated JSX (for example 5,000 levels) that must not overflow.
4. Measure against the Phase 3 baseline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 No recursive walkTree remains; deep generated JSX does not overflow (test)
- [x] #2 Diagnostics on the corpus are unchanged (diff)
- [x] #3 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
- [x] #5 No measurable slowdown: Solid rule callback time with scope analysis isolated by the probe rule (median of 9 interleaved runs against the HEAD bundle) is within 3% of HEAD; method and numbers in the notes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Failing test first: deep generated JSX (5,000 levels) through reactivity in real oxlint and RuleTester must not throw RangeError.
2. CPU-profile reactivity on the corpus (node --cpu-prof on oxlint) to find where its ~13.5 ms callback time goes.
3. Replace recursive walkTree with an explicit stack (same visit order and skip semantics); cache findVariable per identifier node (per file); fix hot spots the profile shows.
4. Verify: corpus diagnostics snapshot identical; parity report identical; unit/upstream suites; bench:profile solidjs callbacksMs vs baseline 20.33 ms (AC: >= 30% lower), wall numbers too.
5. Changeset (solidjs patch), notes, commit, ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
BLOCKED on AC #2 (needs a maintainer decision); work below is uncommitted in the working tree.

## Done (uncommitted)
- packages/solidjs/src/utils/walk.ts: walkTree moved out of reactivity.ts and made iterative (explicit stack, same pre-order: fields in key order, arrays in index order, `parent` skipped, skip() prunes).
- reactivity.ts: findVariable cached per identifier node (module-level WeakMap keyed by node: per file by construction, no retention).
- Tests: packages/solidjs/tests/walk.test.ts (100,000-level synthetic tree; order/skip; parent/non-node). Failing first: recursive version -> "RangeError: Maximum call stack size exceeded" (1 fail / 2 pass); iterative -> 3/3. tests/cli/solidjs.cli.test.ts "reactivity on deep JSX": 1,800 nested elements in createMemo, real oxlint, no JS plugin error (pass).

## Deep JSX findings (oxlint 1.93.0, --threads 1, file `createMemo(() => <div>...x...</div>)`)
- No JS plugins (native rule only): 4,000 levels OK, 5,000 -> process exits 132 with no output (native parser stack overflow).
- Any JS plugin (solidjs/jsx-no-undef+prefer-show, or reactivity): 1,800 OK; 1,900+ -> "RangeError: Maximum call stack size exceeded at deserializeJSXIdentifier ... deserializeJSXElement" (oxlint's own AST deserializer), before any rule runs. So in oxlint the recursive walkTree was never the first thing to overflow on JSX.
- ESLint 9 + @typescript-eslint/parser: on Node the parser fails from 2,000 ("Parsing error: Maximum call stack size exceeded"); on Bun 5,000 levels parse and reactivity (recursive walkTree) completed; 10,000 parser fails.

## AC #2 (>= 30% lower Solid corpus cost) — measured as not achievable by changing this repo
- Baseline (tests/bench/baseline/darwin-arm64.json): solidjs plugin wall 112.3 ms, delta over no-JS-plugins 81.7 ms, rule callbacks 20.33 ms. Wall/delta are dominated by the fixed JS-plugin runtime load (~53 ms for any single trivial rule), so a 30% wall/delta cut is impossible; callbacks is the only meaningful metric.
- Split of the callbacks (all 20 Solid rules, 7 runs): 20.6-21.3 ms total. With a probe rule that only calls getScope(Program) running first (it absorbs oxlint's lazy scope analysis): Solid rules 10.6-11.1 ms, probe 12.5-13.2 ms. So ~10 ms of "Solid's" callback time is oxlint's scope analysis (charged to whichever rule asks first; reactivity needs scopes), ~10.8 ms is our code across all 20 rules; reactivity's own share ~4.9-5.4 ms.
- A 30% cut (~6.3 ms) would require removing ~58% of all Solid rules' own time, more than reactivity's entire own cost.
- This change, interleaved before/after (HEAD bundle built in a temp worktree vs working tree; 9 runs each, median): all rules 20.72 -> 21.95 ms (reactivity 13.05 -> 14.12); with probe 10.64 -> 11.21 ms (reactivity 4.87 -> 5.19). I.e. no gain (within noise / slightly slower).
- CPU profile of reactivity's own code (3 runs, 20 us sampling, inclusive): onFunctionExit 9.9, CallExpression 7.2, checkForTrackedScopes 6.7, consumeRefs 3.7, handleTrackedScopes 2.9, matchImport 2.5 ms; work is spread out, no single hot spot. Estimated best case from further tuning (matchImport reverse map, consumeRefs/isRefInCurrentScope): ~1-1.5 ms of 21 ms (5-7%).

## Verified
- AC #1: no recursive walkTree remains (utils/walk.ts iterative); deep tests above pass.
- AC #3: corpus diagnostics snapshot (all rules of each plugin, corpus + CLI + bench fixtures, 7218 diagnostics) byte-identical to the pre-TASK-029 snapshot. solidjs unit 25/25; upstream solid 462 pass + 4 skipped. `bun run lint`: pass.

## Decision needed
AC #2 as written can't be met by this repo (oxlint scope analysis + fixed runtime dominate). Options: (a) restate AC #2 against Solid rules' own callback time with scope analysis isolated (e.g. probe method above), with a realistic target; (b) drop the performance target for TASK-030 and keep the robustness work; (c) keep it and accept TASK-030 stays open (blocks TASK-031..034 and the 0.3.0 release).

## Maintainer decision (2026-11-12): AC #2 changed
The original AC "The Solid plugin's corpus cost drops by at least 30% against the baseline" was removed and replaced (now AC #5) with a no-regression guard: "No measurable slowdown: Solid rule callback time with scope analysis isolated by the probe rule (median of 9 interleaved runs against the HEAD bundle) is within 3% of HEAD". Why: the 30% target came from the audit attributing plugin-removal savings, which include oxlint's fixed JS-plugin runtime load (~53 ms) and its lazy scope analysis (~10 ms, charged to the first rule that asks for scopes), to the Solid rules; the measurements above show the rules' own code is ~10.8 ms of 21 ms callbacks (reactivity ~5 ms). Decision also: keep the iterative walkTree, drop the findVariable cache unless neutral/faster on its own, document the deep-JSX limits, no m-4 tuning follow-up. (BLOCKED status above is resolved by this decision.)

## AC #5 measurement (method)
- Three solidjs bundles: HEAD (5042b04, built in a temp `git worktree`), walk-only (HEAD + iterative walkTree), walk+cache (walk-only + findVariable WeakMap cache). Each run: real oxlint 1.93.0, `--threads 1 -f default --debug=timings` on tests/fixtures/corpus, all 20 Solid rules plus a probe rule `probe/scope-only` (Program: getScope(node)) loaded first so it absorbs scope analysis; metric = sum of `solidjs/*` rule times. Runs interleaved head/walk/both, 9 rounds, median; whole experiment repeated twice.
- Round 1: HEAD 10.57 ms; walk-only 10.67 ms (+0.9%); walk+cache 11.01 ms (+4.1%). reactivity 4.85 / 4.86 / 5.05.
- Round 2: HEAD 10.51 ms; walk-only 10.60 ms (+0.8%); walk+cache 11.00 ms (+4.6%). reactivity 4.86 / 4.87 / 5.12.
- => the cache costs ~+3.5% on its own: dropped. Final code = walk-only: +0.8-0.9% vs HEAD, within 3% (AC #5 met).

## Final state
- Iterative walkTree (packages/solidjs/src/utils/walk.ts) + tests (walk.test.ts 3/3; CLI deep JSX 1,800 levels).
- No findVariable cache (reactivity.ts lookup unchanged from HEAD).
- Deep-JSX limits documented in packages/solidjs/README.md "Deeply nested JSX" (oxlint deserializer ~1,900 nested elements with any JS plugin; native parser ~5,000, exit 132; @typescript-eslint/parser on Node ~2,000).
- Changeset .changeset/solidjs-reactivity-iterative-walk.md (solidjs patch).
- AC #2 (diagnostics): re-diffed on the final code: 7218 diagnostics byte-identical.
- `bun run gate`: exit 0; unit (Node) 301/301 (+3 walk tests), upstream query 1457 + 5 skipped, solid 462 + 4 skipped, compat 41, CLI 270/270 (+1), bench 6/6.

Verified with scripts/ci-local.sh (7c7f1f1, PASS); GitHub Actions unavailable (billing lock). Incl. CLI deep-JSX test on oxlint 1.70.0 floor and pinned 1.93.0.
<!-- SECTION:NOTES:END -->
