# oxlint-plugin-immutable

Immutability and functional-style lint rules ported from [eslint-plugin-functional](https://github.com/eslint-functional/eslint-plugin-functional) to [Oxlint's JS plugin API](https://oxc.rs/docs/guide/usage/linter/plugins). Also works with ESLint flat config via the bundled `eslintCompatPlugin` wrapper.

> **Note:** Rules that require the TypeScript type checker (deep immutability analysis) are not implemented — Oxlint's JS plugin API operates on AST only. The `prefer-immutable-types` rule uses `ReadonlyShallow` enforcement mode, and `type-declaration-immutability` uses structural AST analysis.

## Requirements

- Oxlint `>= 1.70.0 < 2` (tested with 1.70.0 and the pinned version, 1.93.0). Oxlint JS plugins are
  alpha and outside oxlint's semver, so other versions may break; earlier versions use a different
  rule-name scheme (see below).
- Node.js `^20.19.0 || >= 22.12.0` (oxlint's own requirement)
- ESLint `>= 9` (optional, only for the ESLint flat-config path)

## Rule names and suppression comments

On oxlint >= 1.70 the plugin's rules are named `immutable/<rule>` (oxlint strips the
`oxlint-plugin-` prefix). Use that short form everywhere:

```jsonc
// .oxlintrc.json
{ "rules": { "immutable/<rule>": "error" } }
```

```ts
// oxlint-disable-next-line immutable/<rule>
```

The long form `oxlint-plugin-immutable/<rule>` still works as a config key, but **disable comments
with the long form are ignored** on oxlint >= 1.70, and the short form doesn't exist before 1.70.
When upgrading from oxlint <= 1.69, rename suppressions, config keys and the oxlint version
together: the [0.2 migration guide](https://github.com/g5becks/oxlint-plugins/blob/main/docs/migration-0.2.md)
has a codemod that does the renaming. Diagnostics are printed as `immutable(<rule>)`.

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
    "immutable/no-let": "error",
    "immutable/no-throw-statements": "error",
    "immutable/type-declaration-immutability": "error",
    "immutable/immutable-data": "error"
  }
}
```

## Usage with ESLint

```js
// eslint.config.mjs
import immutablePlugin from "oxlint-plugin-immutable/dist/index.js";

export default [
  {
    plugins: { immutable: immutablePlugin },
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

### `type-declaration-immutability` without type information

The rule checks the declared type **syntactically** for `ReadonlyShallow` (the property itself
must be `readonly`; its value type may be mutable, so `{ readonly items: string[] }` is fine):

| Declaration | Result |
|---|---|
| `{ a: string }`, `interface I { a: string }`, `{ [k: string]: T }` | reported |
| `T[]`, `Array<T>`, `[A, B]` | reported (use `readonly T[]`, `ReadonlyArray<T>`, `readonly [A, B]`) |
| `Map`, `Set`, `WeakMap`, `WeakSet`, `Record<K, V>` | reported (use `ReadonlyMap`, `ReadonlySet`, `Readonly<Record<K, V>>`) |
| `{ [K in X]: T }`, `{ -readonly [K in X]: T }` | reported (use `{ readonly [K in X]: T }`) |
| unions and intersections | reported when any member is reported |
| `Partial`, `Required`, `Pick`, `Omit`, `NonNullable` over a literal | follows the literal |
| `Readonly<T>`, `readonly` arrays/tuples, primitives, literals, function types | accepted |

What it **can't see** without a type checker (upstream eslint-plugin-functional resolves these):

- **Named types:** `type A = SomeInterface` or `Partial<SomeType>`, where the referenced
  declaration lives elsewhere. Those aren't reported here; the referenced declaration is checked
  where it is declared.
- **Classes and generic parameters:** `type A = MyClass`, `type A<T> = T`.
- **Deep immutability:** only `ReadonlyShallow` is enforced. The upstream `Immutable` and
  `ReadonlyDeep` levels need type information.

Measured against upstream `eslint-plugin-functional@10.0.1` (type-aware, ReadonlyShallow /
AtLeast) on a 22-declaration probe, the rule agrees on all 22
(`packages/immutable/tests/type-declaration-immutability-probe.test.ts`).

## License

MIT
