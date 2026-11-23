---
id: TASK-047
title: >-
  solidjs/no-write-in-reactive-scope: Setter calls in memos, effect computes and
  component bodies
status: To Do
assignee: []
created_date: '2026-11-23T20:29:00Z'
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
- [ ] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [ ] #2 Fixtures from the cited examples: createMemo(() => setDoubled(...)), createComputed→createSignal(fn), untrack(() => setX()) still reported, event handler / onSettled / apply writes valid, ownedWrite: true valid, refresh() in a memo reported
- [ ] #3 Nothing is reported at version 1
- [ ] #4 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [ ] #5 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->
