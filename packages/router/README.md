# oxlint-plugin-router

TanStack Router lint rules ported to [Oxlint's JS plugin API](https://oxc.rs/docs/guide/usage/linter/plugins). Also works with ESLint flat config via the bundled `eslintCompatPlugin` wrapper.

Supports **TanStack Router v1.x**.

## Requirements

- Oxlint `>= 1.0.0` (requires `jsPlugins` support)
- Node.js `>= 18`

## Installation

```sh
npm add -D oxlint-plugin-router
# or
bun add -d oxlint-plugin-router
```

## Usage with Oxlint

Add the plugin to `jsPlugins` and enable the rules you want:

```json
// .oxlintrc.json
{
  "jsPlugins": ["./node_modules/oxlint-plugin-router/dist/index.js"],
  "rules": {
    "oxlint-plugin-router/create-route-property-order": "error",
    "oxlint-plugin-router/route-param-names": "error"
  }
}
```

## Usage with ESLint

```js
// eslint.config.mjs
import routerPlugin from "oxlint-plugin-router/dist/index.js";

export default [
  {
    plugins: { router: routerPlugin },
    rules: routerPlugin.configs.recommended.rules,
  },
];
```

## Rules

The **Recommended** column shows the severity used in `plugin.configs.recommended`.

| Rule | Description | Recommended |
|---|---|---|
| `create-route-property-order` | Enforces correct property ordering in `createRoute()` calls — order is significant for TypeScript inference | error |
| `route-param-names` | Route path params like `$id` must be valid JavaScript identifiers | error |

## License

MIT
