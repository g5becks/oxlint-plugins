# oxlint-plugin-query

TanStack Query lint rules ported to [Oxlint's JS plugin API](https://oxc.rs/docs/guide/usage/linter/plugins). Also works with ESLint flat config via the bundled `eslintCompatPlugin` wrapper.

Supports **TanStack Query v5.x** (`@tanstack/react-query`, `@tanstack/solid-query`, `@tanstack/vue-query`).

## Requirements

- Oxlint `>= 1.0.0` (requires `jsPlugins` support)
- Node.js `>= 18`

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
    "oxlint-plugin-query/exhaustive-deps": "error",
    "oxlint-plugin-query/no-rest-destructuring": "warn",
    "oxlint-plugin-query/stable-query-client": "error",
    "oxlint-plugin-query/no-unstable-deps": "error",
    "oxlint-plugin-query/infinite-query-property-order": "error",
    "oxlint-plugin-query/mutation-property-order": "error"
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
