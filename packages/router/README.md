# oxlint-plugin-router

TanStack Router lint rules ported to [Oxlint's JS plugin API](https://oxc.rs/docs/guide/usage/linter/plugins). Also works with ESLint flat config via the bundled `eslintCompatPlugin` wrapper.

Supports **TanStack Router v1.x**.

## Requirements

- Oxlint `>= 1.70.0 < 2` (tested with 1.70.0 and the pinned version, 1.93.0). Oxlint JS plugins are
  alpha and outside oxlint's semver, so other versions may break; earlier versions use a different
  rule-name scheme (see below).
- Node.js `^20.19.0 || >= 22.12.0` (oxlint's own requirement)
- ESLint `>= 9` (optional, only for the ESLint flat-config path)

## Rule names and suppression comments

On oxlint >= 1.70 the plugin's rules are named `router/<rule>` (oxlint strips the
`oxlint-plugin-` prefix). Use that short form everywhere:

```jsonc
// .oxlintrc.json
{ "rules": { "router/<rule>": "error" } }
```

```ts
// oxlint-disable-next-line router/<rule>
```

The long form `oxlint-plugin-router/<rule>` still works as a config key, but **disable comments
with the long form are ignored** on oxlint >= 1.70, and the short form doesn't exist before 1.70.
When upgrading from oxlint <= 1.69, rename suppressions, config keys and the oxlint version
together: the [0.2 migration guide](https://github.com/g5becks/oxlint-plugins/blob/main/docs/migration-0.2.md)
has a codemod that does the renaming. Diagnostics are printed as `router(<rule>)`.

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
    "router/create-route-property-order": "error",
    "router/route-param-names": "error"
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
