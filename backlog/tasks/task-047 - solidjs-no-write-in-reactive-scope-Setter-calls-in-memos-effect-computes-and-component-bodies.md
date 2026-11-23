---
id: TASK-047
title: >-
  solidjs/no-write-in-reactive-scope: Setter calls in memos, effect computes and
  component bodies
status: Done
assignee:
  - '@claude'
created_date: '2026-11-23T20:29:00Z'
updated_date: '2026-11-23T21:09:00Z'
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
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New rule (version 2 only): the static form of REACTIVE_WRITE_IN_OWNED_SCOPE. Writing reactive state in an owned scope throws in 2.0 dev, and `untrack` doesn't exempt it (RFC 01 §No writes under owned scope; RFC 08 §REACTIVE_WRITE_IN_OWNED_SCOPE; MIGRATION §"Write inside reactive scope").

**Writes:** calls to the setter (`[1]`) of `createSignal`, `createOptimistic`, `createStore` (including `createStore(fn)`) or `createOptimisticStore` imported from solid-js; and `refresh(...)`, which is the same diagnostic's second message.

**Exempt:** `createSignal(v, { ownedWrite: true })` (literal options object). Stores have no exemption: 2.0.3's StoreOptions has no `ownedWrite`.

**Owned scopes:** component bodies (the same detection as reactivity: a capitalized function with JSX, or a props parameter); `createMemo`; effect computes; and the derive functions of `createSignal(fn)`, `createStore(fn)`, `createProjection`, `createOptimistic(fn)` and `createOptimisticStore(fn)`. A write counts when it runs synchronously in that scope: directly, inside `untrack(fn)`, inside array-iteration callbacks, or inside IIFEs. Writes in functions that run later (event handlers, effect apply, `onSettled`, timers, promise callbacks, `action` bodies) are fine. Writes through a projection's own draft parameter aren't setter calls.

**Not covered (documented):** custom `use*` hook bodies, helper methods that write internally (agentx's `apiKey.sync(...)` in BrokersPage.tsx:368), control-flow function children, and `createTrackedEffect` (an effect-phase scope).

**Autofix:** none. The fix is to derive (`createMemo`, `createSignal(fn)`) or move the write.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [x] #2 Fixtures from the cited examples: createMemo(() => setDoubled(...)), createComputed→createSignal(fn), untrack(() => setX()) still reported, event handler / onSettled / apply writes valid, ownedWrite: true valid, refresh() in a memo reported
- [x] #3 Nothing is reported at version 1
- [x] #4 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [x] #5 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Preview on agentx client/src at version 2: 73 reports, all writes inside 1.x single-function createEffect bodies copying props/server data into form signals (settings/*Page.tsx 63, StrategyBuilderSheet 3, WatchlistSheet 3, command-menu 2, AlertSheet 1, ActivateAlertForm 1). The first preview labeled them "an effect's compute function", which is wrong for an unsplit effect; they now get writeInLegacyEffect, which points at createSignal(() => ...) or a split effect's apply (agentx-pm asked that the message name the alternatives). No component-body or memo writes found.
Version 1: all-rules diff vs the 2fd695f build 71 = 71, 20 = 20; gate PASS.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
New rule no-write-in-reactive-scope (version 2 only, error in recommended-v2): setter calls of createSignal/createOptimistic/createStore/createOptimisticStore and refresh() that run synchronously (including through untrack, flush, array callbacks, IIFEs) in a component body, memo, effect compute, derive function, or 1.x single-function effect (writeInLegacyEffect). ownedWrite: true exempts signals. Messages name the alternatives. Docs: packages/solidjs/docs/rules/no-write-in-reactive-scope.md.
<!-- SECTION:FINAL_SUMMARY:END -->
