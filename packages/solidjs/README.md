# oxlint-plugin-solidjs

SolidJS lint rules ported from [eslint-plugin-solid](https://github.com/solidjs-community/eslint-plugin-solid) to [Oxlint's JS plugin API](https://oxc.rs/docs/guide/usage/linter/plugins). Also works with ESLint flat config via the bundled `eslintCompatPlugin` wrapper.

Supports **SolidJS v1.x**.

## Requirements

- Oxlint `>= 1.0.0` (requires `jsPlugins` support)
- Node.js `>= 18`

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
    "oxlint-plugin-solidjs/reactivity": "warn",
    "oxlint-plugin-solidjs/no-destructure": "error",
    "oxlint-plugin-solidjs/jsx-no-duplicate-props": "error",
    "oxlint-plugin-solidjs/prefer-for": "error"
  }
}
```

> **Important:** Disable `jsx-uses-vars` when running under Oxlint. The `context.markVariableAsUsed` API is not yet implemented in Oxlint — Oxlint handles unused variable detection natively. See the [Rules](#rules) section for details.

## Usage with ESLint

```js
// eslint.config.mjs
import solidPlugin from "oxlint-plugin-solidjs/dist/index.js";

export default [
  {
    plugins: { solid: solidPlugin },
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
| `jsx-uses-vars` | Mark JSX variables as used — **disable under Oxlint** (see note above) | error |
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
