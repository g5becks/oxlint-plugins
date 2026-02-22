# oxlint-plugin-ts-no-assert

Disallow TypeScript type assertions (`as`, angle-bracket `<Type>`, and non-null `!`) — ported from [eslint-plugin-no-type-assertion](https://github.com/Dremora/eslint-plugin-no-type-assertion) to [Oxlint's JS plugin API](https://oxc.rs/docs/guide/usage/linter/plugins). Also works with ESLint flat config via the bundled `eslintCompatPlugin` wrapper.

## Requirements

- Oxlint `>= 1.0.0` (requires `jsPlugins` support)
- Node.js `>= 18`

## Installation

```sh
npm add -D oxlint-plugin-ts-no-assert
# or
bun add -d oxlint-plugin-ts-no-assert
```

## Usage with Oxlint

Add the plugin to `jsPlugins` and enable the rule:

```json
// .oxlintrc.json
{
  "jsPlugins": ["./node_modules/oxlint-plugin-ts-no-assert/dist/index.js"],
  "rules": {
    "oxlint-plugin-ts-no-assert/no-type-assertion": "error"
  }
}
```

## Usage with ESLint

```js
// eslint.config.mjs
import tsNoAssertPlugin from "oxlint-plugin-ts-no-assert/dist/index.js";

export default [
  {
    plugins: { "no-type-assertion": tsNoAssertPlugin },
    rules: tsNoAssertPlugin.configs.recommended.rules,
  },
];
```

## Rules

### `no-type-assertion/no-type-assertion`

Disallows all three forms of TypeScript type assertion.

**Forbidden:**

```ts
const x = value as MyType;     // ❌ Do not use `as` operator for type assertion
const x = <MyType>value;       // ❌ Do not use type assertion (angle-bracket)
const x = maybeNull!;          // ❌ Do not use non-null assertion operator
```

**Allowed** — safe widening that TypeScript itself endorses:

```ts
const x = value as unknown;    // ✅ widening to unknown is safe
const x = value as const;      // ✅ const assertion
const x = <unknown>value;      // ✅
const x = <const>value;        // ✅
```

> **Note on angle-bracket syntax:** TypeScript disallows `<Type>value` in `.tsx` files because it is syntactically ambiguous with JSX. The `angleBracketAssertion` diagnostic will only appear in plain `.ts` files.

| Rule | Description | Recommended |
|---|---|---|
| `no-type-assertion` | Disallow `as`, `<Type>`, and `!` type assertions (except `as const` / `as unknown`) | error |

## License

MIT
