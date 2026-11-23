---
id: TASK-044
title: 'solidjs/reactivity: Solid 2.0 tracking model at version 2'
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
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
At version 2, `reactivity` models Solid 2.0's tracking. The version-1 code path is untouched.

**Tracked scopes (reads subscribe):** compute (arg 0) of `createEffect`/`createRenderEffect` (RFC 01 §Split tracking from effect); `createTrackedEffect`; `createMemo` (sync or async); function-form `createSignal(fn)`/`createOptimistic(fn)` and `createStore(fn)`/`createOptimisticStore(fn)`/`createProjection(fn)` (MIGRATION §New function forms; RFC 04 §Derived stores); `resolve(fn)`/`until(fn)` (MIGRATION §New in 2.0); `children`, `createDeferred`, `untrack`, and the `mapArray`/`repeat` map functions, as today.

**Untracked, reads allowed (like 1.x onMount and event handlers):** `onSettled`/`onFlush` callbacks (solid-js 2.0.3 signals.d.ts on onSettled: "Reactive reads inside the callback are *not* tracked"); `action(function* …)` bodies (RFC 06); ref callbacks, including functions inside `ref={[…]}` arrays (MIGRATION §Ref callbacks: no longer owned); native-element event handlers, which are `on` plus an uppercase letter only (MIGRATION §Attributes & events). A lowercase `on*` is an attribute, so its expression is an ordinary reactive attribute.

**Effect apply (arg 1, or the `effect`/`error` of an EffectBundle):** untracked. A direct reactive read there gets a new message, `readInApply` ("read it in the compute function and use the value passed to apply"): 2.0 warns STRICT_READ_UNTRACKED for it (RFC 08 §STRICT_READ_UNTRACKED; RFC 01 §Stores in the compute phase).

**Transparent (reads count in the enclosing scope):** `isPending(fn)` and `latest(fn)` evaluate `fn` where they're called, so the call itself must be in a tracked scope (MIGRATION §Initial loading vs in-flight changes, §Peeking in-flight values). The same holds for `flush(fn)`, store-setter draft callbacks (as today) and array-iteration callbacks (as today).

**Reactive values:** `[0]` of createSignal/createOptimistic is a signal; createMemo/createDeferred results are signals; `[0]` of createStore/createOptimisticStore, the result of createProjection, and the results of `merge(...)`/`omit(...)` are props-like (RFC 04). `<For>`: default/`keyed={true}` gives an index accessor (as 1.x); `keyed={false}` gives an item accessor (the old Index model); `keyed={fn}` gives both as accessors. `<Repeat>` gives a plain-number index. Non-keyed function children of `<Show>`/`<Match>` receive an accessor; keyed ones get the raw value (RFC 03 §List rendering, §Conditionals; MIGRATION §Function children may receive accessors). `mapArray(…, { keyed: false })` gives an item accessor.

**Async:** `noAsyncTrackedScope` no longer reports computations that accept async: createMemo, the function forms above, and effect computes (RFC 05). It still reports `createTrackedEffect`, `children` and `untrack`. New `readAfterAwait`: in an async computation, a reactive source first read after the function's first `await` (and not also read before it, nor inside `untrack`) is reported. This is the static UNTRACKED_READ_AFTER_AWAIT (RFC 08 §UNTRACKED_READ_AFTER_AWAIT, which recommends a lint rule for exactly this). `async function*` bodies are skipped.

**Removed from the version-2 model:** `on`, `createComputed`, `createResource`, `createSelector`, `createMutable`, `indexArray`, `splitProps`, `mergeProps`, `observable`, `useTransition`, `batch`/`produce` as sync callbacks, `<Index>`, `onMount`, `onError`, `use:` directives. no-removed-apis reports them.

**Provider value:** `<Ctx value={…}>`, where `Ctx` is a local `createContext(...)`, is treated like the 1.x `.Provider` value (MIGRATION §Context providers).

**Corrections to agentx-pm §2.8:** `onSettled` reads are untracked, not a tracked scope; `isPending`/`latest` are transparent, not tracked scopes (treating them as tracked would hide `const p = isPending(() => x())` in a component body).

**Autofix:** none (the rule has no fixes).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [ ] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged, including reactivity-parity.test.ts
- [ ] #3 Valid/invalid fixtures for each bullet: split effects (MIGRATION §Effects), function-form signals/stores, async memos with reads before and after await, isPending/latest at top level vs in JSX, onSettled reads, ref callbacks, For keyed modes, Repeat, Show accessors, lowercase on* attributes
- [ ] #4 New messages readInApply and readAfterAwait are tested, with no report inside untrack
- [ ] #5 bench:profile shows no reactivity callbacksMs regression at version 1 against the committed baseline (noted in the commit)
- [ ] #6 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [ ] #7 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->
