# Migrating a Solid 1.x app to Solid 2.0 with oxlint-plugin-solidjs

`oxlint-plugin-solidjs` checks Solid 1.x code by default. Set `settings.solidjs.version: 2` and its
rules follow Solid 2.0. Their autofixes then work as a codemod for the mechanical part of a
migration, and the remaining reports are your list of manual changes.

The authority for every 2.0 rule is the
[Solid 2.0 migration guide](https://github.com/solidjs/solid/blob/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0/MIGRATION.md)
and its RFCs. Each rule's page in `packages/solidjs/docs/rules/` cites the section it follows.

## 1. Preview, before you switch

Lint the 1.x app at version 2 without fixing anything. Keep your current config and add a separate
one for the preview:

```jsonc
// .oxlintrc.solid2.json
{
  "jsPlugins": ["./node_modules/oxlint-plugin-solidjs/dist/index.js"],
  "settings": { "solidjs": { "version": 2 } },
  "rules": {
    // your current solidjs/* rules, plus the 2.0-only ones:
    "solidjs/no-removed-apis": "error",
    "solidjs/effect-split": "error",
    "solidjs/no-write-in-reactive-scope": "error",
    "solidjs/no-classlist": "error",
    "solidjs/no-cleanup-in-ref": "error",
    "solidjs/reconcile-key": "warn",
    "solidjs/for-keyed-literal": "warn"
  }
}
```

```sh
node_modules/.bin/oxlint -c .oxlintrc.solid2.json src
```

The counts per rule are the size of the migration. At version 1, the 2.0-only rules report nothing,
so the same rules can stay in your main config until you switch.

## 2. Apply the safe fixes

```sh
node_modules/.bin/oxlint -c .oxlintrc.solid2.json --fix src
```

**Run it until it changes nothing.** oxlint applies one non-overlapping set of fixes per run, and
several rules edit the import block. Our worst-case test file needs 3 runs, a real app needed 2,
and a further run is always a no-op (tests/cli/solidjs-v2.cli.test.ts).

What `--fix` does. Every fix is behavior-preserving or follows a 1:1 rename in the guide:

| Rule | Fixes |
|---|---|
| `imports` | `solid-js/web` → `@solidjs/web`; `solid-js/store` → `solid-js` (merged); `solid-js/h`, `/html`, `/universal`, `jsx-runtime`; the `JSX` type to `@solidjs/web` |
| `no-removed-apis` | `Suspense` → `Loading`; `ErrorBoundary` → `Errored` (the fallback's `err` becomes `err()`); `SuspenseList` → `Reveal`; `Index` → `<For keyed={false}>`; `onMount` → `onSettled` (only when the callback is safe there); `equalFn` → `isEqual`; `getListener` → `getObserver`; `<Ctx.Provider>` → `<Ctx>` |
| `no-classlist` | `classList` → `class` object/array values |
| `event-handlers` | a function on a lowercase `on*` → the camelCase handler (`onclick` → `onClick`) |
| `effect-split` | an expression-bodied apply/`onSettled` callback whose value can't be a cleanup → a block body |
| `reconcile-key` | the 1.x `{ key }` options object → the key argument |
| `no-destructure` | destructured props → `props.x`; a rest element → `omit(props, ...)` |

## 3. Review the suggestions

These changes behave differently in 2.0, so they're suggestions, not autofixes. Apply them in your
editor one at a time, or with `--fix-suggestions` and a careful diff review:

- `mergeProps` → `merge`: an explicit `undefined` now overrides a default instead of being skipped.
- `unwrap` → `snapshot`: it returns a copy where the store changed.
- `reconcile(value)` → `reconcile(value, "id")` or `reconcile(value, null)`: pick the key your data
  uses (`"_id"`, a function, …).
- `on:click` → `onClick`, `attr:x` → `x`, `use:x={v}` → `ref={x(v)}` (`no-unknown-namespaces`).
- `<Repeat count={n}>` for count-based lists (`prefer-for`).

## 4. The manual work

What remains are reports without a fix, mostly design changes:

- **Effects** (`effect-split`, `no-write-in-reactive-scope`): split each single-function effect
  into compute and apply. Writes go in the apply function, in event handlers or in `onSettled`. To
  copy a prop or server value into editable state, use a writable derived signal,
  `createSignal(() => props.value)`. Writes in a compute, memo or component body throw
  `REACTIVE_WRITE_IN_OWNED_SCOPE`.
- **Async data** (`no-removed-apis`): `createResource` → an async `createMemo` under `<Loading>`;
  `batch` → nothing (or `flush()`); `on` → a split effect; `produce` → a draft setter;
  `splitProps` → `omit`.
- **Reactivity** (`reactivity` at version 2): reads in an effect's apply function (`readInApply`),
  reads after the first `await` of an async computation (`readAfterAwait`), and reads in
  `<For>`/`<Show>` callback bodies.
- **Refs** (`no-cleanup-in-ref`): move lifecycle work out of ref callbacks into `onSettled` or a
  directive factory.

## 5. Switch

Once the app is on Solid 2.0, move `settings.solidjs.version: 2` and the 2.0-only rules into your
main config, and delete the preview config.
