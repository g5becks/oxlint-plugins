# oxlint-plugin-immutable

Immutability and functional-style lint rules ported from [eslint-plugin-functional](https://github.com/eslint-functional/eslint-plugin-functional) to [Oxlint's JS plugin API](https://oxc.rs/docs/guide/usage/linter/plugins). Also works with ESLint flat config via the bundled `eslintCompatPlugin` wrapper.

> **Note:** Rules that require the TypeScript type checker (deep immutability analysis) are not implemented — Oxlint's JS plugin API operates on AST only. The `prefer-immutable-types` rule uses `ReadonlyShallow` enforcement mode, and `type-declaration-immutability` uses structural AST analysis.

## Requirements

- Oxlint `>= 1.0.0` (requires `jsPlugins` support)
- Node.js `>= 18`

## Installation

```sh
npm add -D oxlint-plugin-immutable
# or
bun add -d oxlint-plugin-immutable
```

## Usage with Oxlint

Add the plugin to `jsPlugins` and enable the rules you want:

```json
// .oxlintrc.json
{
  "jsPlugins": ["./node_modules/oxlint-plugin-immutable/dist/index.js"],
  "rules": {
    "oxlint-plugin-immutable/no-let": "error",
    "oxlint-plugin-immutable/no-throw-statements": "error",
    "oxlint-plugin-immutable/type-declaration-immutability": "error",
    "oxlint-plugin-immutable/immutable-data": "error"
  }
}
```

## Usage with ESLint

```js
// eslint.config.mjs
import immutablePlugin from "oxlint-plugin-immutable/dist/index.js";

export default [
  {
    plugins: { functional: immutablePlugin },
    rules: immutablePlugin.configs.recommended.rules,
  },
];
```

## Rules

The **Recommended** column shows the severity used in `plugin.configs.recommended`. Rules with `—` are implemented but not included in the recommended config.

| Rule | Description | Recommended |
|---|---|---|
| `no-let` | Disallow `let` declarations — prefer `const` | error |
| `no-throw-statements` | Disallow `throw` statements | error |
| `prefer-property-signatures` | Prefer property signatures over method signatures in types | error |
| `prefer-immutable-types` | Enforce `ReadonlyShallow` on parameters, return types, and variables (AST-only) | error |
| `type-declaration-immutability` | Type aliases and interfaces must be at least `ReadonlyShallow` | error |
| `no-promise-reject` | Disallow `Promise.reject()` | — |
| `immutable-data` | Disallow mutating methods on arrays/objects (`push`, `splice`, etc.) | — |
| `readonly-type` | Enforce `readonly` on TypeScript type members | — |

## License

MIT
