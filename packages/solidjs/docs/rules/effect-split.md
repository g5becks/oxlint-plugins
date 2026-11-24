# solidjs/effect-split

Enforces Solid 2.0's split effects (a compute function plus an apply function) and the cleanup rules
of the effect-phase scopes.

**Version 2 only:** the rule reports nothing unless `settings.solidjs.version` is `2`.

Sources are the Solid 2.0 docs at
[solidjs/solid@cd201ce](https://github.com/solidjs/solid/tree/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0)
and the solid-js 2.0.3 type declarations (`createEffect(compute, effectFn | EffectBundle, options?)`).

| Report | What | Source |
|---|---|---|
| `missingApply` | `createEffect(fn)` / `createRenderEffect(fn)` with one argument. 2.0 has no single-argument overload: it throws `MISSING_EFFECT_FN`. `createTrackedEffect(fn)` is the single-callback form. | RFC 08 §MISSING_EFFECT_FN; MIGRATION §Effects, lifecycle, and cleanup; RFC 01 §createTrackedEffect and onSettled |
| `initialValue` | A second argument that is a value (literal, array, object-free expression, or a `const` of one), such as 1.x `createEffect(fn, 0)`. The second argument is now the apply function or an EffectBundle. Use a default parameter: `(prev = 0) => ...`. | MIGRATION §Effects ("The initialValue parameter from 1.x is gone") |
| `memoInitialValue` | `createMemo(fn, 0)`: the second argument is now options. | MIGRATION §Effects ("This same change applies to createMemo") |
| `invalidCleanup` | An apply, `createTrackedEffect` or `onSettled` callback that returns a value that can't be a cleanup: an expression body that is an assignment, a literal, an object, an array, a template, arithmetic, a comparison, `!`/`-`/`typeof`, `new`, or JSX; or a `return` of one. Calls and identifiers aren't reported, since they may return functions. | RFC 08 §Invalid cleanup return value |
| `asyncCallback` | An async apply, `createTrackedEffect` or `onSettled` callback: it returns a Promise. | RFC 08 §Invalid cleanup return value |
| `cleanupInScope` | `onCleanup` in an apply function, a `createTrackedEffect` body or an `onSettled` body. Return the cleanup instead. | RFC 08 §CLEANUP_IN_FORBIDDEN_SCOPE; MIGRATION §Effects |
| `cleanupInLegacyEffect` | `onCleanup` in a 1.x single-function effect: when you split it, return the cleanup from apply. | MIGRATION §Effects |
| `primitiveInLeaf` | `createSignal`, `createMemo`, `createEffect`, `createStore`, … called in `createTrackedEffect` or `onSettled`. | RFC 08 §PRIMITIVE_IN_FORBIDDEN_SCOPE |

`onCleanup` in a **compute** function is allowed and not reported. RFC 01: "onCleanup remains for
reactive lifecycle cleanup inside computations"; RFC 05 registers an abort before the first `await`.

"In the body" means the function's own body, plus callbacks that run in place: array iteration
methods and IIFEs. Functions that run later (event handlers, timers) don't count.

## Autofix

`invalidCleanup` on an expression-bodied arrow wraps the body in a block, keeping the source text
after `=>` as written, parentheses included:

```js
createEffect(() => name(), (value) => (el.title = value));
// becomes
createEffect(() => name(), (value) => { (el.title = value); });
```

This preserves behavior: the value was never a valid cleanup, and Solid 2.0 throws on it. Everything
else is report-only, because there's no mechanical way to split a 1.x effect.
