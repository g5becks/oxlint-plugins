# oxlint-plugin-ts-no-assert

Disallow TypeScript type assertions (`as`, angle-bracket `<Type>`, and non-null `!`) — ported from [eslint-plugin-no-type-assertion](https://github.com/Dremora/eslint-plugin-no-type-assertion) to [Oxlint's JS plugin API](https://oxc.rs/docs/guide/usage/linter/plugins). Also works with ESLint flat config via the bundled `eslintCompatPlugin` wrapper.

## Requirements

- Oxlint `>= 1.70.0 < 2` (tested with 1.70.0 and the pinned version, 1.93.0). Oxlint JS plugins are
  alpha and outside oxlint's semver, so other versions may break; earlier versions use a different
  rule-name scheme (see below).
- Node.js `^20.19.0 || >= 22.12.0` (oxlint's own requirement)
- ESLint `>= 9` (optional, only for the ESLint flat-config path)

## Rule names and suppression comments

On oxlint >= 1.70 the plugin's rules are named `ts-no-assert/<rule>` (oxlint strips the
`oxlint-plugin-` prefix). Use that short form everywhere:

```jsonc
// .oxlintrc.json
{ "rules": { "ts-no-assert/<rule>": "error" } }
```

```ts
// oxlint-disable-next-line ts-no-assert/<rule>
```

The long form `oxlint-plugin-ts-no-assert/<rule>` still works as a config key, but **disable comments
with the long form are ignored** on oxlint >= 1.70, and the short form doesn't exist before 1.70.
When upgrading from oxlint <= 1.69, rename suppressions, config keys and the oxlint version
together: the [0.2 migration guide](https://github.com/g5becks/oxlint-plugins/blob/main/docs/migration-0.2.md)
has a codemod that does the renaming. Diagnostics are printed as `ts-no-assert(<rule>)`.

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
    "ts-no-assert/no-type-assertion": "error"
  }
}
```

## Usage with ESLint

```js
// eslint.config.mjs
import tsNoAssertPlugin from "oxlint-plugin-ts-no-assert/dist/index.js";

export default [
  {
    plugins: { "ts-no-assert": tsNoAssertPlugin },
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
