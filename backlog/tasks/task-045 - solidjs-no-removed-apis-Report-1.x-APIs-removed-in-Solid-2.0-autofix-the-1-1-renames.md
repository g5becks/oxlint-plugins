---
id: TASK-045
title: >-
  solidjs/no-removed-apis: Report 1.x APIs removed in Solid 2.0, autofix the 1:1
  renames
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
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New rule (version 2 only): APIs that 1.x had and 2.0 doesn't. It matches only names imported from `solid-js`, `solid-js/web`, `solid-js/store` or `@solidjs/web`, so a local function named `on` or `batch` is never reported. Its autofix is the codemod for agentx's mechanical migration.

**Autofix (safe and idempotent; renames the import specifier and every reference, including JSX tags):**
- `Suspense`→`Loading` (MIGRATION §Suspense / ErrorBoundary → Loading / Errored; same `fallback`/children).
- `ErrorBoundary`→`Errored`. The fallback callback's error is an accessor in 2.0 (solid-js 2.0.3 `Errored` type: `(err: ErrorAccessor, reset)`; MIGRATION §onError / catchError shows `err().message`), so each read of the first parameter is rewritten `err` → `err()`. Fixed when the fallback is an element, or a function whose first parameter is a plain identifier (or absent); a destructured parameter is report-only.
- `SuspenseList`→`Reveal` (MIGRATION §Coordinating loading boundaries): `revealOrder="forwards"` is dropped (sequential is the default), `revealOrder="together"` becomes `order="together"`, `tail="collapsed"` becomes `collapsed`. `revealOrder="backwards"`, `tail="hidden"` and non-literal values are report-only.
- `equalFn`→`isEqual`, `getListener`→`getObserver` (MIGRATION §Quick rename / removal map).
- `unwrap`→`snapshot` (MIGRATION §unwrap(store) → snapshot(store); RFC 04 §snapshot). snapshot copies where the store changed, so code that mutated unwrap's result behaves differently; the docs page says so.
- `<Ctx.Provider>`→`<Ctx>`, both opening and closing tags (MIGRATION §Context providers). 2.0's `Context` has no `Provider` member (solid-js 2.0.3 `types/client/core.d.ts`). Fixed when `Ctx` is a local `createContext(...)` from solid-js, or an import from a project path (relative, `~/`, `@/`, `#`); otherwise report-only.
- `onMount`→`onSettled` (MIGRATION §Effects, lifecycle, and cleanup). Fixed only when the callback is an inline non-async function whose own body calls no `onCleanup`, no primitive (`create*`), no `flush()` and returns no value. Those throw inside onSettled: CLEANUP_IN_FORBIDDEN_SCOPE, PRIMITIVE_IN_FORBIDDEN_SCOPE, "`flush()` inside forbidden scope" and "Invalid cleanup return value" (RFC 08). An expression body is wrapped in a block so its result isn't returned as a "cleanup". Otherwise the rule reports and says why.
- `<Index>`→`<For keyed={false}>`, adding `For` to the solid-js import if needed. RFC 03 §Index → For keyed={false} calls it the direct replacement, with the same callback shape (item accessor, numeric index). This is a **proposed deviation**: the brief lists Index as report-only.

**Suggestion only** (applied by `oxlint --fix-suggestions`, needs review): `mergeProps`→`merge`. In 2.0 an explicit `undefined` overrides instead of being skipped (MIGRATION §mergeProps / splitProps → merge / omit; RFC 04 §merge), so the rename isn't behavior-preserving. This is a **correction to the brief**, which lists it as an autofix.

**Report only (the message names the replacement):** createResource, batch, startTransition, useTransition, on, produce, createComputed, createMutable, modifyMutable, splitProps (→ `omit`, reading picked keys from props). From the guide's removal list but not in the brief, **proposed:** createSelector, onError, catchError, indexArray, observable, resetErrorBoundaries, enableScheduling, writeSignal, createDynamic, clearDelegatedEvents, and the `/*@once*/` JSX marker (MIGRATION §Detailed removal guide, §Quick rename / removal map, §/*@once*/ JSX marker).

**Not here:** import paths belong to `imports` (TASK-048), so a path isn't reported twice with two competing fixes. This **deviates from the brief**, which puts paths in this rule.

**No fix when:** the new name would collide with another binding visible at any rewritten reference (for example a user component named `Loading`), or the specifier uses a string-literal name. Those report without a fix.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [x] #2 Each rename is fixed with before/after fixtures from the cited section, including aliased imports, an existing import of the new name, and JSX opening/closing tags
- [x] #3 Every no-fix condition (name collision, destructured Errored param, unmappable Reveal props, unsafe onMount body, non-project Provider import) reports without a fix, with a test each
- [x] #4 Idempotence: a CLI test runs oxlint --fix on a fixture with every fixable case; a second --fix changes nothing and leaves no fixable report; fix-safety (parse + typecheck) covers the rule
- [x] #5 Report-only entries name their replacement in the message; nothing is reported at version 1
- [x] #6 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [x] #7 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Decisions from agentx-pm (2026-11-23, plan review): (a) Index -> <For keyed={false}> is an autofix; test that (item, i) usages survive unchanged. (b) The extra report-only removals (createSelector, onError, catchError, indexArray, observable, resetErrorBoundaries, enableScheduling, writeSignal, createDynamic, clearDelegatedEvents, /*@once*/) are in. (d) unwrap -> snapshot is a suggestion, not an autofix (behavior differs for code that mutated the result; the codemod must never change behavior silently). mergeProps -> merge stays a suggestion.

Implementation notes:
- oxlint --fix applies one pass per run, and each rename spans its specifier and every use, so per-report fixes overlapped (8 runs for the fix fixture). Every fixable report of a file now carries one combined fix (combinedFix): one run applies all safe renames; a rename whose edits would overlap ones already taken waits for the next pass. Test: tests/cli/solidjs-v2.cli.test.ts "version-2 autofixes are idempotent" (second --fix changes nothing, no fixable report left).
- fix-safety.cli.test.ts runs a solidjs rule at version 2 when fixtures/fix-safety/solidjs-v2/<rule>.tsx exists.
- Found on agentx (read-only preview): a context with a same-named TypeScript type (components/ui/sidebar.tsx) resolved to the type def; Provider resolution now uses the value definition (regression case).
- Index -> For keyed={false}: (item, i) callbacks are unchanged (unit + fix fixture).
Preview on agentx client/src at version 2 (scratch config, so components/ui not ignored): 60 reports: splitProps 31, mergeProps 8 (suggestion), ErrorBoundary 4, Suspense 4, Provider 7 (6 fixable), onMount 3 (1 not fixed: async callback), createResource 1, on 1, unwrap 1 (suggestion), produce 1. TASK-060 reruns with agentx config.
Version 1: all-rules diff vs the 2fd695f build still 71 = 71 (fixtures+corpus), 20 = 20 (agentx); gate PASS.

Follow-up in the TASK-046 commit: the onMount expression-body wrap used getText(body), which drops parentheses, so `() => ({ a })` became `{ { a }; }` (a block). It now keeps the source after `=>` as written; regression case added.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
New rule no-removed-apis (version 2 only, error in recommended-v2): autofixes Suspense, ErrorBoundary (err -> err()), SuspenseList (order/collapsed), Index (For keyed={false}), onMount (when safe), equalFn, getListener and Ctx.Provider in one combined per-file fix; suggestions for mergeProps and unwrap; reports the removed APIs and /*@once*/. Docs: packages/solidjs/docs/rules/no-removed-apis.md.
<!-- SECTION:FINAL_SUMMARY:END -->
