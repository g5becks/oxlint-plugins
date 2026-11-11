# oxlint-plugin-solidjs

SolidJS lint rules ported from [eslint-plugin-solid](https://github.com/solidjs-community/eslint-plugin-solid) to [Oxlint's JS plugin API](https://oxc.rs/docs/guide/usage/linter/plugins). Also works with ESLint flat config via the bundled `eslintCompatPlugin` wrapper.

Supports **SolidJS v1.x**.

## Requirements

- Oxlint `>= 1.70.0 < 2` (tested with 1.70.0 and the pinned version, 1.93.0). Oxlint JS plugins are
  alpha and outside oxlint's semver, so other versions may break; earlier versions use a different
  rule-name scheme (see below).
- Node.js `^20.19.0 || >= 22.12.0` (oxlint's own requirement)
- ESLint `>= 9` (optional, only for the ESLint flat-config path)

## Rule names and suppression comments

On oxlint >= 1.70 the plugin's rules are named `solidjs/<rule>` (oxlint strips the
`oxlint-plugin-` prefix). Use that short form everywhere:

```jsonc
// .oxlintrc.json
{ "rules": { "solidjs/<rule>": "error" } }
```

```ts
// oxlint-disable-next-line solidjs/<rule>
```

The long form `oxlint-plugin-solidjs/<rule>` still works as a config key, but **disable comments
with the long form are ignored** on oxlint >= 1.70, and the short form doesn't exist before 1.70.
When upgrading from oxlint <= 1.69, rename suppressions, config keys and the oxlint version
together: the [0.2 migration guide](https://github.com/g5becks/oxlint-plugins/blob/main/docs/migration-0.2.md)
has a codemod that does the renaming. Diagnostics are printed as `solidjs(<rule>)`.

## Installation

```sh
npm add -D oxlint-plugin-solidjs
# or
bun add -d oxlint-plugin-solidjs
```

## Usage with Oxlint

Add the plugin to `jsPlugins` and enable the rules you want:

```json
// .oxlintrc.json
{
  "jsPlugins": ["./node_modules/oxlint-plugin-solidjs/dist/index.js"],
  "rules": {
    "solidjs/reactivity": "warn",
    "solidjs/no-destructure": "error",
    "solidjs/jsx-no-duplicate-props": "error",
    "solidjs/prefer-for": "error"
  }
}
```

> **`jsx-uses-vars`:** this rule marks variables used in JSX as used (through `sourceCode.markVariableAsUsed`), so `no-unused-vars` doesn't flag them. Oxlint implements that API since 1.56, so the rule works on every supported oxlint version (it crashed on older ones). Oxlint's built-in `no-unused-vars` already understands JSX usage, so under oxlint the rule is usually redundant; whether the `recommended` preset keeps it is being re-evaluated against upstream parity.

## Usage with ESLint

```js
// eslint.config.mjs
import solidPlugin from "oxlint-plugin-solidjs/dist/index.js";

export default [
  {
    plugins: { solidjs: solidPlugin },
    rules: solidPlugin.configs.recommended.rules,
  },
];
```

## Rules

The **Recommended** column shows the severity used in `plugin.configs.recommended`. Rules with `—` are implemented but not included in the recommended config.

### Reactivity

| Rule | Description | Recommended |
|---|---|---|
| `reactivity` | Detect reactive variables used outside of tracked scopes | warn |
| `no-destructure` | Disallow destructuring props — breaks reactivity, use `splitProps` instead | error |
| `components-return-once` | Component functions should have a single return path | warn |

### JSX & DOM

| Rule | Description | Recommended |
|---|---|---|
| `jsx-no-duplicate-props` | Disallow duplicate props on JSX elements | error |
| `jsx-no-undef` | Disallow undefined variables in JSX | error |
| `jsx-no-script-url` | Disallow `javascript:` URLs in JSX | error |
| `jsx-uses-vars` | Mark JSX variables as used (works on oxlint >= 1.56; see note above) | error |
| `no-innerhtml` | Disallow `innerHTML`/`outerHTML` | error |
| `no-unknown-namespaces` | Disallow unknown JSX namespace prefixes | error |
| `self-closing-comp` | Enforce self-closing tags for components without children | warn |

### API & Patterns

| Rule | Description | Recommended |
|---|---|---|
| `no-proxy-apis` | Disallow proxy-incompatible APIs | error |
| `no-react-deps` | Disallow React-style dependency arrays | warn |
| `no-react-specific-props` | Disallow React-specific props (`className`, `htmlFor`) | warn |
| `no-array-handlers` | Disallow array index as event handler | warn |
| `event-handlers` | Enforce correct event handler naming conventions | warn |
| `imports` | Enforce importing from the correct `solid-js` sub-path | warn |
| `style-prop` | Validate the `style` prop (CSS property names and values) | warn |

### Preferences (auto-fixable)

| Rule | Description | Recommended |
|---|---|---|
| `prefer-for` | Prefer `<For>` over `.map()` in JSX | error |
| `prefer-show` | Prefer `<Show>` over ternaries/`&&` in JSX | — |
| `prefer-classlist` | Prefer `classList` object over ternary `class` strings | — |

## License

MIT
