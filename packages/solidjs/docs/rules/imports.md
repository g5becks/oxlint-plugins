# solidjs/imports

Enforces importing each Solid API from the module that owns it.

- **Version 1** (the default): the 1.x map (`solid-js`, `solid-js/web`, `solid-js/store`) of
  [eslint-plugin-solid 0.14.5](https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/imports.md),
  unchanged.
- **Version 2** (`settings.solidjs.version: 2`): the Solid 2.0 map, plus the import-path migration.

Sources are the Solid 2.0 docs at
[solidjs/solid@cd201ce](https://github.com/solidjs/solid/tree/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0)
and the solid-js / @solidjs/web 2.0.3 export lists. The tables live in `src/utils/solid2.ts`.

## Version 2

### Import paths (`movedModule`, autofix)

| 1.x | 2.0 | Source |
|---|---|---|
| `solid-js/web` | `@solidjs/web` | MIGRATION §Imports: where things live now |
| `solid-js/store` | `solid-js` (merged into an existing value import from `solid-js`) | MIGRATION §Imports |
| `solid-js/h` | `@solidjs/h` | MIGRATION §Quick rename / removal map |
| `solid-js/html` | `@solidjs/html` | MIGRATION §Quick rename / removal map |
| `solid-js/universal` | `@solidjs/universal` | MIGRATION §Quick rename / removal map |
| `solid-js/jsx-runtime`, `solid-js/jsx-dev-runtime` | `@solidjs/web/jsx-runtime`, `@solidjs/web/jsx-dev-runtime` | RFC 09 §Migration / replacement |

Rewriting the path is safe: the same names exist at the new path, except APIs that 2.0 removed,
which `solidjs/no-removed-apis` reports. A type-only import keeps its own declaration.

### Module map (`prefer-source`, autofix)

- `solid-js` has the core, the store APIs (`createStore`, `reconcile`, `snapshot`, `deep`,
  `createProjection`, `createOptimisticStore`), and the flow components.
- `@solidjs/web` has `render`, `hydrate`, `Portal`, `Dynamic`, `dynamic`, `clientOnly`, `isServer`,
  `isDev`, `renderToString`, `renderToStream`, `HydrationScript`, `generateHydrationScript`,
  `httpStatus`, `httpHeader` and `getRequestEvent`, plus the types `JSX` and `MountableElement`
  (RFC 09 §Renderer packages own JSX namespaces).
- Flow components that `@solidjs/web` re-exports (`For`, `Show`, `Loading`, …) are preferred from
  `solid-js`, as in 1.x.
- `ComponentProps` and `ValidComponent` exist in both packages with different meanings, so they
  aren't mapped.

The fix moves the specifier: it rewrites the path of a lone specifier, merges it into an existing
import of the target module, or splits it into a new import.

### Removed types (`removedType`, report only)

`JSXElement` from `solid-js`: use `Element` from `solid-js` for renderer-neutral values, or
`JSX.Element` from `@solidjs/web` (RFC 09 §Removals).

### One fix per file

All of a file's import fixes share one combined fix: they sit in the same import block and would
otherwise overlap. One `oxlint --fix` run applies them, and fixing any one report in an editor fixes
them all. A specifier inside a declaration whose path was just rewritten is checked on the next run.
