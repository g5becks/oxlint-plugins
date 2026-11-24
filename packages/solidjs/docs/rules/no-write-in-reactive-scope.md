# solidjs/no-write-in-reactive-scope

Disallows writing signals and stores in a scope that Solid 2.0 owns: a component body, a memo, an
effect's compute function, or the derive function of a derived signal or store. This is the static form
of the dev-mode error `REACTIVE_WRITE_IN_OWNED_SCOPE`, which throws.

**Version 2 only:** the rule reports nothing unless `settings.solidjs.version` is `2`.

Sources (Solid 2.0 docs at
[solidjs/solid@cd201ce](https://github.com/solidjs/solid/tree/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0)):
RFC 01 §No writes under owned scope; RFC 08 §REACTIVE_WRITE_IN_OWNED_SCOPE; MIGRATION §"Write inside
reactive scope" (owned scope) and §createComputed → createMemo, createEffect, or derived createSignal.

## What counts as a write

- A call to the setter (`[1]`) of `createSignal`, `createOptimistic`, `createStore` (including
  `createStore(fn)`) or `createOptimisticStore` imported from Solid.
- `refresh(...)` (the same diagnostic's second message).

**Exempt:** `createSignal(value, { ownedWrite: true })` (and `createOptimistic`) with a literal
options object, per RFC 01. Stores have no such option in 2.0.3.

## Where

| Scope | Message |
|---|---|
| A component body: a capitalized function that renders JSX | `writeInScope` |
| `createMemo` / `createDeferred` | `writeInScope` |
| The compute function of a split `createEffect` / `createRenderEffect` | `writeInScope` |
| The derive function of `createSignal(fn)`, `createOptimistic(fn)`, `createStore(fn)`, `createOptimisticStore(fn)`, `createProjection(fn)` | `writeInScope` |
| The body of a 1.x single-function `createEffect(fn)` | `writeInLegacyEffect`: in 2.0 that body becomes the compute function |

A write counts when it runs synchronously in that scope: directly, inside `untrack(...)` (RFC 01:
`untrack` stops tracking, not ownership), in an array iteration callback, in `flush(fn)`, or in an
IIFE. Writes in functions that run later are fine: event handlers, effect apply functions,
`onSettled`, timers, promise callbacks and `action` bodies. Writes through a projection's own draft
parameter aren't setter calls.

## Why writes in an effect's apply function are allowed

RFC 01 §No writes under owned scope lists "effect" among the scopes where a write throws. The other
lines of the docs, and the runtime, show that this means the compute half:

- RFC 08 §REACTIVE_WRITE_IN_OWNED_SCOPE: "Writing to reactive state or invalidating a reactive source
  inside a reactive scope (**effect compute**, memo, component body) throws."
- RFC 01 §Stores in the compute phase: "The effect callback (back half) runs in an **untracked scope**."
- RFC 01 §Keeping a write out of another update's hold: `onFlush` exists to make writes, and you
  should "call it from event handlers and effect callbacks". In a component body or computation it
  warns `ON_FLUSH_IN_OWNED_SCOPE`.
- MIGRATION §"Write inside reactive scope": "return cleanup from effect apply functions (instead of
  writing during tracking)".
- RFC 08 §EFFECT_WRITES_OWN_SOURCE treats "an effect's callback wrote a signal or store" as a
  performance finding, not an error.
- **The runtime:** `packages/solidjs/tests/no-write-in-reactive-scope-runtime.test.ts` runs the
  development build of `@solidjs/signals` 2.0.3. A write in a compute is reported as
  `REACTIVE_WRITE_IN_OWNED_SCOPE`. The same write in the apply function isn't, and it lands. Writes
  in a memo, a derived signal, an owner body and `untrack()` inside it throw; `onSettled` and
  `{ ownedWrite: true }` don't.

One runtime caveat: the apply phase must run after the owned body returns, which is what happens
normally (effects flush on a microtask). An apply phase forced by `flush()` from inside a component
body still runs under that owner, and its writes throw.

## What to do instead

- **Derive the value:** `createMemo(() => count() * 2)`.
- **Copy a prop or server value into editable state:** use a writable derived signal,
  `const [value, setValue] = createSignal(() => props.initial)`. It follows the source until the
  user overrides it (MIGRATION §createComputed).
- **Side effects:** write from an event handler, the apply function of a split effect, or `onSettled`.
- **Internal flags** that must be written in owned scope: `{ ownedWrite: true }`.

## Not covered

- Custom `use*` hook bodies, which run in the caller's scope.
- Helper methods that write internally (`state.sync(value)`).
- Control-flow function children.
- `createTrackedEffect`, which is an effect-phase scope.

There's no autofix: the fix is a design choice.
