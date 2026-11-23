---
"oxlint-plugin-solidjs": minor
---

New rule `no-write-in-reactive-scope` (Solid 2.0, `settings.solidjs.version: 2` only; `error` in `recommended-v2`). It's the static form of `REACTIVE_WRITE_IN_OWNED_SCOPE`, and reports setter calls and `refresh()` that run synchronously in:
- a component body;
- a memo;
- an effect's compute function;
- a derived signal or store;
- a 1.x single-function effect.

`untrack` doesn't exempt a write, and `{ ownedWrite: true }` does. The messages name the alternatives: `createMemo`, `createSignal(() => ...)`, an event handler, the effect's apply function, or `onSettled`.
