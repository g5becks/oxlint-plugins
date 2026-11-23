---
"oxlint-plugin-solidjs": minor
---

New rule `no-removed-apis` (Solid 2.0, `settings.solidjs.version: 2` only; `error` in `recommended-v2`) reports 1.x APIs that Solid 2.0 removed.

**Autofix:** the 1:1 renames when every use site is safe. A file's fixes apply together in one `oxlint --fix` run, and a second run changes nothing.
- `Suspense` → `Loading`
- `ErrorBoundary` → `Errored` (the fallback's `err` becomes `err()`)
- `SuspenseList` → `Reveal` (with `order`/`collapsed`)
- `Index` → `<For keyed={false}>`
- `onMount` → `onSettled` (only when the callback is safe in onSettled)
- `equalFn` → `isEqual`
- `getListener` → `getObserver`
- `<Ctx.Provider>` → `<Ctx>`

**Suggestion only:** `mergeProps` → `merge` and `unwrap` → `snapshot`, since their behavior differs.

**Report only:** the APIs removed without a 1:1 replacement (`createResource`, `batch`, `on`, `produce`, `splitProps`, `createComputed`, `createMutable`, …), and the `/*@once*/` marker.
