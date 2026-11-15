---
id: TASK-042
title: >-
  errorset: no-unguarded-data-access false positives (instanceof, ||, typed
  declarations)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-14T23:47:00Z'
updated_date: '2026-11-15T02:13:00Z'
labels:
  - errorset
  - bug
dependencies: []
priority: high
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
agentx (TASK-309.05) suppressed 16 no-unguarded-data-access reports on 0.2.1 as false positives, in five patterns: (a) r.data after if (G(r)) return r; (b) instanceof Error guard clause; (c) instanceof Error || isErr(e); (d) A(x) || B(x); (e) a parameter typed as the error set with a kind-guard early exit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Failing tests first (packages/errorset/tests/no-unguarded-data-access-fp.test.ts)
- [x] #2 instanceof (native Error or set guard via Symbol.hasInstance) narrows; instanceof of a set guard marks the variable as guarded
- [x] #3 || of two narrowing tests narrows (both sides required); !(A || B) guard clause narrows
- [x] #4 Variables/parameters declared with an error-set type (or union of set types) are never reported
- [x] #5 Pattern (a) stays reported by design (wrong-branch case), documented in the rule README
- [x] #6 prefer-guard-over-manual-kind-check narrowing unchanged
- [x] #7 bun run gate passes
- [x] #8 agentx temp clone: suppressions kept -> 0 reports; 16 suppressions removed -> only the 7 pattern-(a) accesses report
- [x] #9 Changeset (oxlint-plugin-errorset patch)
- [x] #10 Opt-in option allowOnSuccessValue (default false) allows accesses where a guard proves the value is not an error; instanceof is excluded from that inverse
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Triage against the rule's definition (README: properties may not exist because the value may be a success result):
- (b) instanceof Error, (c) instanceof Error || isErr(e), (d) A(x) || B(x), (e) parameter typed as the set: false positives (the value is proven to have the property). Fixed.
- (a) r.data after if (G(r)) return r: by design. The value is proven to be the success result, the same 'wrong branch' case the existing tests assert (else branch, ternary alternate, G(r) || r.data). Without types the rule can't tell the success value's own .data from a misplaced error access. Kept, documented in the README with what to do. Changing it is an owner decision.

Fix: createNarrowing gets { broad: true } (used only by no-unguarded-data-access): instanceof narrows, || narrows when both sides do; the rule marks r guarded on 'r instanceof <guard>'; declaredAsErrorSet() exempts variables whose every definition is annotated with a set type or a union of set types. prefer-guard-over-manual-kind-check keeps the narrow forms (instanceof Error blocks and A||B unions say nothing about which kind guard to suggest).

Verification: new tests 10 of 11 valid cases failed before (and the instanceof-before-guard invalid case passed vacuously); 18/18 after. bun run gate PASS (oxlint-plugins-release/errorset-0.2.2/gate-3.log), including bench thresholds. agentx temp clone with the built dist: 0 reports before and after with suppressions kept (no other rule changed); with all 16 suppressions removed, 7 reports remain, all pattern (a): infra keygen-client.ts:205/241/310, plugin-manager/downloader.ts:538/541/552, server coinmarketcap.ts:155. The 9 suppressions for (b)-(e) can be removed in agentx after the release.

Owner delegated the pattern (a) decision: default unchanged (existing wrong-branch tests still assert it), plus opt-in option allowOnSuccessValue. Narrowing.successCall walks the same forms with dedicated inverse tests (notErrWhenTrue/notErrWhenFalse): if (G(r)) return, else branch, G(r) ? x : r.data, !G(r) && r.data, G(r) || r.data, r.set === 'X' guard clause; if (A(r) && ok) return proves nothing; a failed instanceof proves nothing (errorset errors aren't Error instances). Tests: 13 valid / 5 invalid added. bun run gate PASS (oxlint-plugins-release/errorset-0.2.2/gate-4.log). agentx clone, all 16 suppressions removed: option off -> the same 7 pattern-(a) reports; option on in both .oxlintrc.json and server/.oxlintrc.json -> 0 reports, all other lint output identical. So agentx can drop all 16 suppressions after the release by setting the option in both configs.
<!-- SECTION:NOTES:END -->
