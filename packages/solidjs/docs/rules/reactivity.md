# solidjs/reactivity

Reports reactive values (signals, memos, props, stores) that are read where changes won't be tracked.

- **Version 1** (the default): the rule follows
  [eslint-plugin-solid 0.14.5](https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/reactivity.md),
  unchanged.
- **Version 2** (`settings.solidjs.version: 2`): the rule follows Solid 2.0's tracking model, described below.

Sources are the Solid 2.0 docs at
[solidjs/solid@cd201ce](https://github.com/solidjs/solid/tree/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0)
(MIGRATION.md and the RFCs) and the solid-js 2.0.3 type declarations.

## Version 2

### Tracked scopes

Reads in these scopes subscribe:

| Scope | Source |
|---|---|
| The compute function (first argument) of `createEffect` and `createRenderEffect` | RFC 01 §Split tracking from effect |
| `createTrackedEffect`, `createMemo`, `createDeferred` | RFC 01 §createTrackedEffect and onSettled; MIGRATION §New in 2.0 |
| Function forms: `createSignal(fn)`, `createOptimistic(fn)`, `createStore(fn)`, `createOptimisticStore(fn)`, `createProjection(fn)` | MIGRATION §New function forms; RFC 04 §Derived stores |
| `resolve(fn)`, `until(fn)` | MIGRATION §New in 2.0 |
| `children`, `untrack`, and the list accessors of `mapArray` and `repeat` | as in 1.x |

Async computations are allowed (RFC 05): `createMemo`, the effect computes and the function forms above can be `async`. `createTrackedEffect`, `children` and `untrack` still can't.

### Reads allowed, but not tracked

| Scope | Source |
|---|---|
| `onSettled` and `onFlush` callbacks | solid-js 2.0.3 `onSettled`: "Reactive reads inside the callback are *not* tracked" |
| `action(function* () { ... })` bodies | RFC 06 |
| Ref callbacks, including functions inside `ref={[...]}` arrays | MIGRATION §Ref callbacks: no longer owned; RFC 07 §Directives via ref |
| Event handlers on native elements: `on` followed by an uppercase letter only | MIGRATION §Attributes & events |

A lowercase `on*` (`onclick`) is an attribute in 2.0, so its value is an ordinary reactive attribute.

### Reported

- **`readInApply`:** a reactive read in an effect's apply function (the second argument, or `effect`/`error` of an EffectBundle). Apply isn't tracked, and 2.0 warns `STRICT_READ_UNTRACKED` there (RFC 08 §STRICT_READ_UNTRACKED; RFC 01 §Stores in the compute phase). Read the value in the compute function instead.

  ```js
  createEffect(() => id(), (value) => log(value, name())); // name() is reported
  createEffect(() => [id(), name()], ([value, n]) => log(value, n)); // fine
  ```

- **`readAfterAwait`:** in an async computation, a source first read after the first `await` isn't a dependency. This is the static form of `UNTRACKED_READ_AFTER_AWAIT` (RFC 08). Not reported when the same source is also read before the `await`, or when the read is inside `untrack`. `async function*` bodies aren't checked.

  ```js
  createMemo(async () => {
    const res = await fetchItems();
    return res.filter((item) => item.tag === query()); // reported
  });
  ```

- **Control-flow callback bodies:** a read directly in the body of a `<For>`, `<Show>`, `<Match>` or `<Repeat>` callback is reported as untracked (RFC 01 §Strict top-level access). Reads in the JSX the callback returns are tracked.
- **`isPending(fn)` and `latest(fn)`:** these evaluate `fn` where they're called, so the call itself must be in a tracked scope (MIGRATION §Initial loading vs in-flight changes, §Peeking in-flight values). `const p = isPending(() => x())` in a component body is reported; `() => isPending(() => x())` and JSX are fine.
- **Provider values:** `<Ctx value={...}>`, where `Ctx` is a local `createContext(...)`, is read once, like the 1.x `<Ctx.Provider value>` (MIGRATION §Context providers; solid-js 2.0.3 `createContext` reads `props.value` once).

### Reactive values

| Value | Treated as | Source |
|---|---|---|
| `[0]` of `createSignal` / `createOptimistic`; `createMemo` / `createDeferred` results | signal | RFC 01, RFC 06 |
| `[0]` of `createStore` / `createOptimisticStore`; `createProjection`, `merge(...)` and `omit(...)` results | props-like store | RFC 04 |
| `<For>` callback, default or `keyed={true}`: the index | accessor (item is raw, as 1.x) | RFC 03 §List rendering |
| `<For keyed={false}>` callback: the item | accessor (index is a number) | RFC 03 §List rendering |
| `<For keyed={(item) => key}>` callback: item and index | accessors | RFC 03 §List rendering |
| `<Repeat>` callback: the index | plain number | RFC 03 §Range/count rendering |
| Non-keyed `<Show>` / `<Match>` callback: the value | accessor (keyed: raw value) | RFC 03 §Conditionals; MIGRATION §Function children may receive accessors |
| `mapArray(list, fn, { keyed })` | the same keying rules as `<For>` | RFC 03 |

### 1.x APIs in a version-2 file

`on`, `createComputed`, `createSelector`, `createResource`, `createMutable`, `observable`, `indexArray`, `onMount`, `onError`, `mergeProps`, `splitProps`, `useTransition`, `batch`, `produce` and `<Index>` don't exist in 2.0. If a version-2 file still imports them, reactivity treats them as in 1.x, so it adds no noise to what `solidjs/no-removed-apis` reports.
