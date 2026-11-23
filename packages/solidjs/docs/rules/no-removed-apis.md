# solidjs/no-removed-apis

Reports Solid 1.x APIs that Solid 2.0 removed, and fixes the 1:1 renames when every use site is safe.

**Version 2 only:** the rule reports nothing unless `settings.solidjs.version` is `2`.

Its autofix is a migration codemod. Set the version to 2 and run `oxlint --fix`, then review the
suggestions with `oxlint --fix-suggestions`.

Sources are the Solid 2.0 docs at
[solidjs/solid@cd201ce](https://github.com/solidjs/solid/tree/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0)
and the solid-js 2.0.3 type declarations. The tables live in `src/utils/solid2.ts`.

## What it checks

- Only names imported from `solid-js`, `solid-js/web`, `solid-js/store` or `@solidjs/web` are checked. A local function named `on` or `batch` is never reported.
- Type-only imports and namespace imports (`import * as Solid`) aren't checked.
- Each import is reported once, at the import specifier.
- Import paths (`solid-js/web` → `@solidjs/web`, …) are `solidjs/imports`' job at version 2.

## Autofixes

Each fix renames the import specifier and every use, including JSX tags. If the import is aliased
(`Suspense as S`), only the imported name changes. If the new name is already imported, the old
specifier is removed and the existing name is used.

| 1.x | 2.0 | Use-site rewrite | Source |
|---|---|---|---|
| `Suspense` | `Loading` | none | MIGRATION §Suspense / ErrorBoundary → Loading / Errored |
| `ErrorBoundary` | `Errored` | The fallback's error is an accessor: `err` → `err()` (shorthand `{ err }` → `{ err: err() }`) | MIGRATION §onError / catchError; solid-js 2.0.3 `Errored` type |
| `SuspenseList` | `Reveal` | `revealOrder="forwards"` is dropped (sequential is the default), `revealOrder="together"` → `order="together"`, `tail="collapsed"` → `collapsed` | MIGRATION §Coordinating loading boundaries: SuspenseList → Reveal |
| `Index` | `For` | adds `keyed={false}`; the callback `(item, i)` is unchanged (item accessor, numeric index) | RFC 03 §Index → For keyed={false} |
| `onMount` | `onSettled` | an expression body becomes a block, so its result isn't returned as a cleanup | MIGRATION §Effects, lifecycle, and cleanup; RFC 08 |
| `equalFn` | `isEqual` | none | MIGRATION §Quick rename / removal map |
| `getListener` | `getObserver` | none | MIGRATION §Quick rename / removal map |
| `<Ctx.Provider>` | `<Ctx>` | opening and closing tags | MIGRATION §Context providers; solid-js 2.0.3 `Context` has no `Provider` |

All fixable reports in a file share one fix, which applies every safe rename in that file. One
`--fix` run does the whole file, a second run changes nothing, and the file never holds a
half-renamed import. Fixing any one report in an editor renames the whole file.

### When there's no fix

The rule still reports, and the message says why:

- the new name is already used in the file (a binding anywhere, an undeclared global, or a JSX tag);
- `ErrorBoundary`: the fallback's error parameter is destructured or reassigned, or the fallback is neither an inline function nor an element;
- `SuspenseList`: `revealOrder="backwards"`, `tail="hidden"`, a non-literal value, or a spread;
- `Index`: a spread, or an existing `keyed` prop;
- `ErrorBoundary`, `SuspenseList` or `Index` used outside JSX;
- `onMount`: the callback isn't inline, or it's async, or its own body calls `onCleanup` (return the cleanup instead), creates a primitive (`create*`), calls `flush()`, or returns a value. Each of these throws inside `onSettled` (RFC 08 §CLEANUP_IN_FORBIDDEN_SCOPE, §PRIMITIVE_IN_FORBIDDEN_SCOPE, §Invalid cleanup return value). Code inside nested functions, which runs later, doesn't count;
- `<X.Provider>`: `X` isn't a local `createContext(...)` or an import from a project path (relative, `~/`, `@/`, `#`).

## Suggestions only

Applied with `oxlint --fix-suggestions`. They need review because the 2.0 API behaves differently.

| 1.x | 2.0 | Why it isn't an autofix | Source |
|---|---|---|---|
| `mergeProps` | `merge` | An explicit `undefined` now overrides a default instead of being skipped | MIGRATION §mergeProps / splitProps → merge / omit; RFC 04 §merge |
| `unwrap` | `snapshot` | `snapshot` copies where the store changed, so code that mutates the result behaves differently | MIGRATION §unwrap(store) → snapshot(store); RFC 04 §snapshot |

## Report only

The message names the replacement (MIGRATION §Detailed removal guide, §Quick rename / removal map):

- **Removed APIs:** `createResource`, `batch`, `startTransition`, `useTransition`, `on`, `produce`, `createComputed`, `createMutable`, `modifyMutable`, `splitProps` (→ `omit`), `createSelector`, `onError`, `catchError`, `indexArray`, `observable`, `resetErrorBoundaries`, `enableScheduling`, `writeSignal`, `createDynamic`, `clearDelegatedEvents`.
- **The `/*@once*/` marker** (MIGRATION §/*@once*/ JSX marker).
