---
id: TASK-046
title: >-
  solidjs/effect-split: Enforce Solid 2.0's compute/apply effect form and
  cleanup rules
status: Done
assignee:
  - '@claude'
created_date: '2026-11-23T20:29:00Z'
updated_date: '2026-11-23T21:05:00Z'
labels:
  - solidjs
  - solid2
milestone: m-5
dependencies:
  - TASK-043
references:
  - >-
    https://github.com/solidjs/solid/blob/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0/MIGRATION.md
priority: high
type: feature
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New rule (version 2 only): the split-effect contract.

- `createEffect(fn)`/`createRenderEffect(fn)` with one argument: 2.0 has no single-argument overload and throws MISSING_EFFECT_FN (RFC 08 §MISSING_EFFECT_FN; solid-js 2.0.3 signals.d.ts `createEffect(compute, effectFn | EffectBundle, options?)`; MIGRATION §Effects, lifecycle, and cleanup). An identifier compute is valid (`createEffect(count, v => …)`, MIGRATION §on helper → split effects). `createTrackedEffect(fn)` is the valid single-callback form (RFC 01 §createTrackedEffect and onSettled).
- A second argument that is neither a function nor an EffectBundle object (`{ effect, error }`), such as 1.x `createEffect(fn, 0)`, is the removed initialValue. The same holds for `createMemo(fn, <non-object>)` (MIGRATION §Effects: "The initialValue parameter from 1.x is gone"; "the second argument is now options"). Identifiers are traced; unknown ones aren't reported.
- An apply or onSettled callback that returns a value that can't be a cleanup: an expression-bodied arrow whose body is an assignment, a literal, an object, an array, a template, arithmetic, a comparison or `!`, or a block that returns one of those. 2.0 throws "[name] callback returned an invalid cleanup value" (RFC 08 §Invalid cleanup return value). **Autofix:** wrap the expression body in a block (`v => { el.title = v; }`). That's behavior-preserving: the value was never a valid cleanup. Calls are not flagged (their return type is unknown).
- `onCleanup` directly in an apply function, a `createTrackedEffect` body or an `onSettled` body, or in the body of a 1.x single-function effect: "return the cleanup instead" (RFC 08 §CLEANUP_IN_FORBIDDEN_SCOPE; MIGRATION §Effects). **Correction to the brief:** `onCleanup` in a *compute* function is allowed and not reported (RFC 01: "onCleanup remains for reactive lifecycle cleanup inside computations"; RFC 05's abort-before-await example).
- **Proposed addition:** primitives (`createSignal`, `createMemo`, `createEffect`, …) created directly in `createTrackedEffect` or `onSettled` throw PRIMITIVE_IN_FORBIDDEN_SCOPE (RFC 08).

Only the function's own body and its synchronous callbacks count, not nested functions that run later. The rest of the rule is report-only: there's no mechanical split of a 1.x effect.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [x] #2 Fixtures: the guide's 1.x/2.0 effect pairs (single function, initialValue, onCleanup → returned cleanup), EffectBundle, identifier compute, createTrackedEffect, onCleanup in compute (valid)
- [x] #3 Invalid-cleanup-return fixtures with the block-wrap autofix; fix-safety covers it; calls are not flagged
- [x] #4 Nothing is reported at version 1
- [x] #5 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [x] #6 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Decision from agentx-pm (plan review, item c): include the primitives check (create* directly in createTrackedEffect / onSettled throws PRIMITIVE_IN_FORBIDDEN_SCOPE).

Found while testing: the block-wrap fix must keep the parenthesized source (`() => ({ ready: true })`); the same bug in no-removed-apis onMount was fixed in this commit. Identifiers and calls are not flagged as invalid cleanups (they may be functions).
Preview on agentx client/src at version 2: 49 reports: missingApply createEffect 44, createRenderEffect 1, cleanupInLegacyEffect 4.
Version 1: all-rules diff vs the 2fd695f build 71 = 71 (fixtures+corpus), 20 = 20 (agentx); gate PASS.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
New rule effect-split (version 2 only, error in recommended-v2): missingApply (MISSING_EFFECT_FN), initialValue / memoInitialValue, invalidCleanup (autofix wraps expression bodies, parens kept) and asyncCallback for apply/createTrackedEffect/onSettled, cleanupInScope / cleanupInLegacyEffect, primitiveInLeaf. onCleanup in a compute stays valid. Docs: packages/solidjs/docs/rules/effect-split.md.
<!-- SECTION:FINAL_SUMMARY:END -->
