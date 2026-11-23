# oxlint-plugin-solidjs

SolidJS lint rules ported from [eslint-plugin-solid](https://github.com/solidjs-community/eslint-plugin-solid) to [Oxlint's JS plugin API](https://oxc.rs/docs/guide/usage/linter/plugins). Also works with ESLint flat config via the bundled `eslintCompatPlugin` wrapper.

Supports **SolidJS 1.x** by default and **Solid 2.0** as an opt-in (see [Solid 2.0](#solid-20)).

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

> **`jsx-uses-vars`:** don't enable it in `.oxlintrc.json`. It marks variables used in JSX (including Solid directives like `use:tooltip`) through `sourceCode.markVariableAsUsed`, but oxlint's built-in `no-unused-vars` is native and doesn't see that, so under oxlint the rule has no effect (verified on oxlint 1.70 and 1.93). JSX components are already understood natively; a directive imported only for `use:x` is still reported by `no-unused-vars`, so reference it explicitly (`void tooltip;`) or suppress that line. In ESLint the rule works as upstream, so the `recommended` preset (which only ESLint consumes) keeps it.

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

## Solid 2.0

Solid 2.0 behavior is opt-in, and 1.x stays the default. Set the Solid major version your code targets
in `settings.solidjs.version`, which every rule of this plugin reads:

```jsonc
// .oxlintrc.json
{
  "jsPlugins": ["./node_modules/oxlint-plugin-solidjs/dist/index.js"],
  "settings": { "solidjs": { "version": 2 } },
  "rules": {
    "solidjs/reactivity": "warn",
    "solidjs/event-handlers": "error"
  }
}
```

```js
// eslint.config.mjs: the recommended-v2 preset carries the setting
import solidPlugin from "oxlint-plugin-solidjs/dist/index.js";

export default [
  {
    plugins: { solidjs: solidPlugin },
    ...solidPlugin.configs["recommended-v2"],
  },
];
```

- `version` is `1` (default) or `2`. Any other value means 1.
- At version 1, every rule behaves exactly as before.
- At version 2, rules follow the
  [Solid 2.0 migration guide](https://github.com/solidjs/solid/blob/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0/MIGRATION.md)
  and its RFCs. The **Solid 2** column in the rule tables below says what changes.
- Rules marked "2.0 only" report nothing at version 1.
- `configs["recommended-v2"]` is `configs.recommended` with `settings.solidjs.version: 2`, plus
  `event-handlers` at `error`: in 2.0 a function passed to a lowercase `on*` is stringified into an
  attribute. oxlint doesn't load presets, so copy its `settings` and `rules` into `.oxlintrc.json`.

## Rules

The **Recommended** column shows the severity used in `plugin.configs.recommended`. Rules with `—` are implemented but not included in the recommended config. The **Solid 2** column says how a rule behaves at `settings.solidjs.version: 2` (see [Solid 2.0](#solid-20)): "same" means no change.

### Reactivity

| Rule | Description | Recommended | Solid 2 |
|---|---|---|---|
| `reactivity` | Detect reactive variables used outside of tracked scopes | warn | 2.0 tracking model: split effects, async computations, `readInApply`, `readAfterAwait` ([docs](https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/reactivity.md)) |
| `no-destructure` | Disallow destructuring props — breaks reactivity, use `splitProps` instead | error | same |
| `components-return-once` | Component functions should have a single return path | warn | same |
| `no-write-in-reactive-scope` | Disallow signal/store writes and `refresh()` in component bodies, memos, effect computes and derive functions (Solid 2.0's `REACTIVE_WRITE_IN_OWNED_SCOPE`) ([docs](https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/no-write-in-reactive-scope.md)) | — | 2.0 only (`error` in recommended-v2) |
| `effect-split` | Enforce Solid 2.0's compute/apply effects and cleanup rules (`MISSING_EFFECT_FN`, invalid cleanup returns, `onCleanup` and primitives in leaf scopes) ([docs](https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/effect-split.md)) | — | 2.0 only (`error` in recommended-v2) |

### JSX & DOM

| Rule | Description | Recommended | Solid 2 |
|---|---|---|---|
| `jsx-no-duplicate-props` | Disallow duplicate props on JSX elements | error | same |
| `jsx-no-undef` | Disallow undefined variables in JSX | error | same |
| `jsx-no-script-url` | Disallow `javascript:` URLs in JSX | error | same |
| `jsx-uses-vars` | Mark JSX variables as used (ESLint only; a no-op under oxlint, see note above) | error | same |
| `no-innerhtml` | Disallow `innerHTML` with dynamic content (a security risk) and React's `dangerouslySetInnerHTML` | error | same |
| `no-unknown-namespaces` | Disallow unknown JSX namespace prefixes | error | only `prop:` and the XML namespaces; `on:`, `oncapture:`, `attr:`, `bool:`, `use:` report their 2.0 replacement ([docs](https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/no-unknown-namespaces.md)) |
| `self-closing-comp` | Enforce self-closing tags for components without children | warn | same |

### API & Patterns

| Rule | Description | Recommended | Solid 2 |
|---|---|---|---|
| `no-proxy-apis` | Disallow proxy-incompatible APIs | — | same |
| `no-react-deps` | Disallow React-style dependency arrays | warn | same |
| `no-react-specific-props` | Disallow React-specific props (`className`, `htmlFor`) | warn | same |
| `no-removed-apis` | Disallow 1.x APIs removed in Solid 2.0; fix the 1:1 renames (`Suspense`, `ErrorBoundary`, `SuspenseList`, `Index`, `onMount`, `Ctx.Provider`, …) ([docs](https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/no-removed-apis.md)) | — | 2.0 only (`error` in recommended-v2) |
| `no-array-handlers` | Disallow array-form event handlers (`onClick={[handler, data]}`), which are type-unsafe | — | same |
| `event-handlers` | Enforce correct event handler naming conventions | warn | camelCase only: a function on a lowercase `on*` is reported and fixed (`error` in recommended-v2) ([docs](https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/event-handlers.md)) |
| `imports` | Enforce importing from the correct `solid-js` sub-path | warn | 2.0 module map (`@solidjs/web`, stores in `solid-js`) and path migration (`solid-js/web`, `solid-js/store`, …) ([docs](https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/imports.md)) |
| `style-prop` | Validate the `style` prop (CSS property names and values) | warn | same |

### Preferences (auto-fixable)

| Rule | Description | Recommended | Solid 2 |
|---|---|---|---|
| `prefer-for` | Prefer `<For>` over `.map()` in JSX | error | no `<Index>`: `<For keyed={false}>`, and `<Repeat>` for count-based lists ([docs](https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/prefer-for.md)) |
| `prefer-show` | Prefer `<Show>` over ternaries/`&&` in JSX | — | same |
| `prefer-classlist` | Prefer the `classList` prop over a classnames helper (`cn`, `clsx`, `classnames`) in `class` | — | retired: reports nothing (`classList` is removed in 2.0; see `no-classlist`) |
| `no-classlist` | Disallow `classList` (removed in Solid 2.0); fix it into `class` object/array values ([docs](https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/no-classlist.md)) | — | 2.0 only (`error` in recommended-v2) |

## Options

Options go in the rule's config entry, e.g. `"solidjs/reactivity": ["warn", { "customReactiveFunctions": ["track"] }]`.
They are validated against each rule's schema: an unknown key or a wrong type stops oxlint with
"Options validation failed". Same names and defaults as eslint-plugin-solid 0.14.5.

| Rule | Option | Default | Effect |
|---|---|---|---|
| `reactivity` | `customReactiveFunctions` (string[]) | `[]` | Extra functions that may receive signals as arguments (all `create*` and `use*` functions already can) |
| `event-handlers` | `ignoreCase` (boolean) | `false` | Don't report ambiguously named handlers like `onclick` |
| `event-handlers` | `warnOnSpread` (boolean) | `false` | Report event handlers spread into JSX (for Solid < 1.6) |
| `jsx-no-duplicate-props` | `ignoreCase` (boolean) | `false` | Treat prop names that differ only by case as duplicates |
| `jsx-no-undef` | `allowGlobals` (boolean) | `false` | Look up components in the global scope too |
| `jsx-no-undef` | `autoImport` (boolean) | `true` | Fix missing `Show`, `For`, `Switch`, ... with an import from `solid-js` |
| `jsx-no-undef` | `typescriptEnabled` (boolean) | `false` | Don't report undefined variables (leave that to TypeScript); only custom directives and auto-imports |
| `no-innerhtml` | `allowStatic` (boolean) | `true` | Allow `innerHTML` set to a static HTML string |
| `no-unknown-namespaces` | `allowedNamespaces` (string[], at least one) | none | Extra namespace prefixes to allow |
| `prefer-classlist` | `classnames` (string[], at least one) | `["cn", "clsx", "classnames"]` | Helper names to treat as classnames functions |
| `self-closing-comp` | `component` (`"all"` \| `"none"`) | `"all"` | Which components should self-close when they have no children |
| `self-closing-comp` | `html` (`"all"` \| `"void"` \| `"none"`) | `"all"` | Which native elements should self-close (`"void"`: only void elements like `<br />`) |
| `style-prop` | `styleProps` (string[], at least one) | `["style"]` | Props to treat as style objects |
| `style-prop` | `allowString` (boolean) | `false` | Allow string styles (otherwise reported, with a fix to an object) |

## Parity with upstream

The rules follow `eslint-plugin-solid` 0.14.5. Its test suites run unmodified against these ports
on every CI run; differences (including two `reactivity` behaviors that changed upstream in
0.15–0.19) are listed in [PARITY.md](https://github.com/g5becks/oxlint-plugins/blob/main/PARITY.md).

## Deeply nested JSX

`reactivity` walks the subtrees it inspects with an explicit stack, so deep JSX doesn't overflow
it. oxlint is the limit: measured on oxlint 1.93.0, its AST deserializer for JS plugins overflows the stack at about
1,900 nested JSX elements ("Error running JS plugin. RangeError: Maximum call stack size
exceeded", for any JS plugin), and its native parser aborts at about 5,000 (exit code 132, no
output). Under ESLint the parser is the limit (`@typescript-eslint/parser` on Node: about 2,000).

## License

MIT
