# solidjs/no-proxy-apis

Disallows Solid APIs that need ES6 Proxies, for projects that target environments without them.

- **Version 1** (the default): unchanged from
  [eslint-plugin-solid 0.14.5](https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-proxy-apis.md):
  `solid-js/store` imports, function or non-props sources of `mergeProps`, JSX spreads of member or
  call expressions, and `Proxy` itself.
- **Version 2** (`settings.solidjs.version: 2`):

| Check | Why | Source |
|---|---|---|
| `createStore`, `createProjection`, `createOptimisticStore` imported from `solid-js` | Stores are Proxies, and 2.0 exports them from `solid-js` | MIGRATION §Imports: where things live now; @solidjs/signals 2.0.3 (stores have no fallback) |
| `solid-js/store` imports | as in 1.x | |
| A function or non-props source passed to `merge` | `merge` builds a Proxy view when Proxy exists and copies properties otherwise. A function source becomes a memo, which the copy can't read. | @solidjs/signals 2.0.3 `merge` (`SUPPORTS_PROXY`); RFC 04 §merge |
| JSX spreads of member or call expressions, `Proxy` | as in 1.x | |

`omit` isn't reported: in @solidjs/signals 2.0.3 it also falls back to a plain copy without Proxy
(`SUPPORTS_PROXY`). `createMutable` doesn't exist in 2.0 (`solidjs/no-removed-apis` reports it).
