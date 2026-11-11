# oxlint-plugin-query

TanStack Query lint rules ported to [Oxlint's JS plugin API](https://oxc.rs/docs/guide/usage/linter/plugins). Also works with ESLint flat config via the bundled `eslintCompatPlugin` wrapper.

Supports **TanStack Query v5.x** (`@tanstack/react-query`, `@tanstack/solid-query`, `@tanstack/vue-query`).

## Requirements

- Oxlint `>= 1.70.0 < 2` (tested with 1.70.0 and the pinned version, 1.93.0). Oxlint JS plugins are
  alpha and outside oxlint's semver, so other versions may break; earlier versions use a different
  rule-name scheme (see below).
- Node.js `^20.19.0 || >= 22.12.0` (oxlint's own requirement)
- ESLint `>= 9` (optional, only for the ESLint flat-config path)

## Rule names and suppression comments

On oxlint >= 1.70 the plugin's rules are named `query/<rule>` (oxlint strips the
`oxlint-plugin-` prefix). Use that short form everywhere:

```jsonc
// .oxlintrc.json
{ "rules": { "query/<rule>": "error" } }
```

```ts
// oxlint-disable-next-line query/<rule>
```

The long form `oxlint-plugin-query/<rule>` still works as a config key, but **disable comments
with the long form are ignored** on oxlint >= 1.70, and the short form doesn't exist before 1.70.
When upgrading from oxlint <= 1.69, rename suppressions, config keys and the oxlint version
together: the [0.2 migration guide](https://github.com/g5becks/oxlint-plugins/blob/main/docs/migration-0.2.md)
has a codemod that does the renaming. Diagnostics are printed as `query(<rule>)`.

## Installation

```sh
npm add -D oxlint-plugin-query
# or
bun add -d oxlint-plugin-query
```

## Usage with Oxlint

Add the plugin to `jsPlugins` and enable the rules you want:

```json
// .oxlintrc.json
{
  "jsPlugins": ["./node_modules/oxlint-plugin-query/dist/index.js"],
  "rules": {
    "query/exhaustive-deps": "error",
    "query/no-rest-destructuring": "warn",
    "query/stable-query-client": "error",
    "query/no-unstable-deps": "error",
    "query/infinite-query-property-order": "error",
    "query/mutation-property-order": "error"
  }
}
```

## Usage with ESLint

```js
// eslint.config.mjs
import queryPlugin from "oxlint-plugin-query/dist/index.js";

export default [
  {
    plugins: { query: queryPlugin },
    rules: queryPlugin.configs.recommended.rules,
  },
];
```

## Rules

The **Recommended** column shows the severity used in `plugin.configs.recommended`.

| Rule | Description | Recommended |
|---|---|---|
| `exhaustive-deps` | All external variables used in `queryFn` must be listed in `queryKey` | error |
| `no-rest-destructuring` | Object rest destructuring of query results causes excessive re-renders | warn |
| `stable-query-client` | `QueryClient` must be stable across renders | error |
| `no-unstable-deps` | Query key arrays must not contain unstable object references | error |
| `infinite-query-property-order` | Enforces correct property ordering in `useInfiniteQuery` calls | error |
| `mutation-property-order` | Enforces correct property ordering in `useMutation` calls | error |

## License

MIT
