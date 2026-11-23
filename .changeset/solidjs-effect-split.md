---
"oxlint-plugin-solidjs": minor
---

New rule `effect-split` (Solid 2.0, `settings.solidjs.version: 2` only; `error` in `recommended-v2`). It reports:
- single-function `createEffect`/`createRenderEffect`, which throws `MISSING_EFFECT_FN`;
- the removed 1.x initial values of effects and memos;
- apply, `createTrackedEffect` and `onSettled` callbacks that return a non-cleanup value or a Promise;
- `onCleanup` in those scopes;
- primitives created inside `createTrackedEffect`/`onSettled`.

An expression-bodied callback whose value can't be a cleanup is autofixed by wrapping it in a block. Also fixes `no-removed-apis`' `onMount` → `onSettled` wrap for parenthesized object bodies.
