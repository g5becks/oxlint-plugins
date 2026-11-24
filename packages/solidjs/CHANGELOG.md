# oxlint-plugin-solidjs

## 0.3.0

### Minor Changes

- 5ae72d0: New rule `effect-split` (Solid 2.0, `settings.solidjs.version: 2` only; `error` in `recommended-v2`). It reports:
  - single-function `createEffect`/`createRenderEffect`, which throws `MISSING_EFFECT_FN`;
  - the removed 1.x initial values of effects and memos;
  - apply, `createTrackedEffect` and `onSettled` callbacks that return a non-cleanup value or a Promise;
  - `onCleanup` in those scopes;
  - primitives created inside `createTrackedEffect`/`onSettled`.
  
  An expression-bodied callback whose value can't be a cleanup is autofixed by wrapping it in a block. Also fixes `no-removed-apis`' `onMount` → `onSettled` wrap for parenthesized object bodies.
- ce0eed3: `event-handlers` follows Solid 2.0 at `settings.solidjs.version: 2`: only `on` + an uppercase letter is an event handler.
  - A function passed to a lowercase `on*` on a native element, directly or through a spread object, is reported (`lowercase-handler`). In 2.0 it's stringified into an attribute and never runs. It's autofixed to the camelCase name for known DOM events.
  - A dynamic value of unknown type gets a suggestion.
  - A string on a lowercase `on*` is valid (the inline-handler attribute).
  - The messages no longer suggest the removed `attr:` prefix.
  
  Version 1 is unchanged. The fix-safety suite now checks a rule at both versions when it has fixtures for both.
- 92494e8: New rule `for-keyed-literal` (Solid 2.0, `settings.solidjs.version: 2` only; `warn` in `recommended-v2`) reports a dynamic boolean `keyed` (a call, `!x`, a comparison, a logical expression or a conditional) on `<For>` or `mapArray` with function children. In 2.0 the callback's argument shapes depend on the keying mode.
- 6b2de74: `imports` uses the Solid 2.0 module map at `settings.solidjs.version: 2`:
  - `@solidjs/web` for `render`, `hydrate`, `dynamic`, `Portal`, … and the `JSX` type;
  - `solid-js` for the store APIs.
  
  It also migrates the import paths with an autofix:
  - `solid-js/web` → `@solidjs/web`;
  - `solid-js/store` → `solid-js`, merged into an existing import;
  - `solid-js/h`, `solid-js/html`, `solid-js/universal` and the `jsx-runtime` entries.
  
  It reports the removed `JSXElement` type. At version 2, a file's import fixes apply together in one `oxlint --fix` run. Version 1 is unchanged.
- bd30741: New rule `no-classlist` (Solid 2.0, `settings.solidjs.version: 2` only; `error` in `recommended-v2`) reports `classList` on native elements, which Solid 2.0 removed. It autofixes into `class` object/array values, merged with an existing `class`: `class="card" classList={{ a: x() }}` becomes `class={["card", { a: x() }]}`.
- 05b5cbd: New rule `no-cleanup-in-ref` (Solid 2.0, `settings.solidjs.version: 2` only; `error` in `recommended-v2`). Ref callbacks are unowned in 2.0, so the rule reports, inside a ref callback or a ref array:
  - `onCleanup`, which throws;
  - `getOwner()`, which returns `null`;
  - primitives and `onSettled`, which are never disposed.
- af29a48: `no-destructure` no longer generates the removed `splitProps`/`mergeProps` at `settings.solidjs.version: 2`.
  - A rest element is fixed with `omit(props, ...keys)`, imported from `solid-js`.
  - Defaults are reported without a fix: `merge` treats an explicit `undefined` as a value, unlike a destructuring default.
  
  Version 1 is unchanged.
- 519739f: `no-proxy-apis` (off by default) follows Solid 2.0 at `settings.solidjs.version: 2`:
  - it reports the store APIs imported from `solid-js` (`createStore`, `createProjection`, `createOptimisticStore`);
  - it checks `merge` for function sources, which need a Proxy.
  
  `omit` isn't reported: in @solidjs/signals 2.0.3 it falls back to a plain copy without Proxy. Version 1 is unchanged.
- 60eaaad: New rule `no-removed-apis` (Solid 2.0, `settings.solidjs.version: 2` only; `error` in `recommended-v2`) reports 1.x APIs that Solid 2.0 removed.
  
  **Autofix:** the 1:1 renames when every use site is safe. A file's fixes apply together in one `oxlint --fix` run, and a second run changes nothing.
  - `Suspense` → `Loading`
  - `ErrorBoundary` → `Errored` (the fallback's `err` becomes `err()`)
  - `SuspenseList` → `Reveal` (with `order`/`collapsed`)
  - `Index` → `<For keyed={false}>`
  - `onMount` → `onSettled` (only when the callback is safe in onSettled)
  - `equalFn` → `isEqual`
  - `getListener` → `getObserver`
  - `<Ctx.Provider>` → `<Ctx>`
  
  **Suggestion only:** `mergeProps` → `merge` and `unwrap` → `snapshot`, since their behavior differs.
  
  **Report only:** the APIs removed without a 1:1 replacement (`createResource`, `batch`, `on`, `produce`, `splitProps`, `createComputed`, `createMutable`, …), and the `/*@once*/` marker.
- 0ecbad9: `no-unknown-namespaces` follows Solid 2.0 at `settings.solidjs.version: 2`. Only `prop:` and the XML namespaces (`xmlns:`, `xlink:`, `xml:`) are allowed. The removed `on:`, `oncapture:`, `attr:`, `bool:` and `use:` report their 2.0 replacement, with suggestions: `on:click` → `onClick`, `attr:x` → `x`, `use:x={v}` → `ref={x(v)}`. Version 1 is unchanged.
- d5e145a: New rule `no-write-in-reactive-scope` (Solid 2.0, `settings.solidjs.version: 2` only; `error` in `recommended-v2`). It's the static form of `REACTIVE_WRITE_IN_OWNED_SCOPE`, and reports setter calls and `refresh()` that run synchronously in:
  - a component body;
  - a memo;
  - an effect's compute function;
  - a derived signal or store;
  - a 1.x single-function effect.
  
  `untrack` doesn't exempt a write, and `{ ownedWrite: true }` does. The messages name the alternatives: `createMemo`, `createSignal(() => ...)`, an event handler, the effect's apply function, or `onSettled`.
- 56ae040: `prefer-for` follows Solid 2.0 at `settings.solidjs.version: 2`: it no longer suggests the removed `<Index>`, and two-parameter maps name `<For>` and `<For keyed={false}>`. Count-based lists in JSX (`Array.from({ length: n }, fn)`, `[...Array(n)].map(fn)`, `Array(n).fill(x).map(fn)`) suggest `<Repeat count={n}>`. Version 1 is unchanged.
- 9b4d3a6: `reactivity` follows Solid 2.0's tracking model at `settings.solidjs.version: 2`:
  - split effects: compute tracked, apply untracked, with a new `readInApply` report;
  - async computations, with a new `readAfterAwait` report for reads after the first `await`;
  - `onSettled`, `onFlush` and `action` bodies, ref callbacks and ref arrays;
  - camelCase-only event handlers;
  - `For` keyed modes, `Repeat`, and `Show`/`Match` accessor children;
  - reads in control-flow callback bodies;
  - `isPending`/`latest` evaluated where they're called;
  - the new primitives `createOptimistic`, `createProjection`, `merge` and `omit`.
  
  Version 1 is unchanged. The rule's documentation is `packages/solidjs/docs/rules/reactivity.md`.
- aa9b319: New rule `reconcile-key` (Solid 2.0, `settings.solidjs.version: 2` only; `warn` in `recommended-v2`).
  - `reconcile(value)` without a key is reported: 2.0 matches items by `"id"` by default, which silently mismatches data keyed by `_id`. Suggestions: `"id"` or `null`.
  - The 1.x `{ key }` options object is autofixed into the key argument.
  - `merge: false` is reported: there's no 2.0 equivalent.
- 2fd695f: Solid 2.0 is now an opt-in. The new `settings.solidjs.version` setting (`1` by default, or `2`) declares the Solid major version your code targets, and the new `configs["recommended-v2"]` preset sets it to 2 for ESLint flat config. oxlint users add `"settings": { "solidjs": { "version": 2 } }` to `.oxlintrc.json`. Version 1 (the default) changes nothing. The README's "Solid 2.0" section shows the setup; the rules gain version-2 behavior in later changes.

### Patch Changes

- c78b93b: Fix `imports`' autofix for inline type specifiers. Moving `import { type JSX, render } from "solid-js/web"` produced `import type { type JSX } from "solid-js"`, which TypeScript rejects (TS2206). It now produces `import { type JSX } from "solid-js"`, and drops the redundant modifier when merging into an existing `import type` declaration.
- 93d1768: `imports`' autofix keeps the `type` modifier when it merges a type-only import into a value import. `import type { Component } from "solid-js/store"` merged into `import { createSignal } from "solid-js"` now gives `import { createSignal, type Component } from "solid-js"`, which compiles under `verbatimModuleSyntax` too. This intentionally diverges from eslint-plugin-solid 0.14.5 (see PARITY.md).
- 044c199: `jsx-no-undef` auto-imports Solid 2.0's control-flow components at `settings.solidjs.version: 2`: `Show`, `For`, `Switch`, `Match`, `Loading`, `Errored`, `Repeat` and `Reveal`. It no longer auto-imports the removed `Index` there. Version 1 is unchanged.
- b36a287: `prefer-classlist` (deprecated, off in `recommended`) reports nothing at `settings.solidjs.version: 2`: Solid 2.0 removes `classList` in favor of `class` object/array values. Version 1 is unchanged.
- 87e72a0: README: the Solid 2.0 section lists what `recommended-v2` contains and links the new migration guide (`docs/migration-solid2.md`). The guide covers previewing at version 2, applying the codemod with `oxlint --fix` until it changes nothing, reviewing the suggestions, and the remaining manual changes.

## 0.2.1

### Patch Changes

- 58a58df: Per-file early exits (rules return `false` from `before()`, which makes oxlint skip them for that file):
  
  - errorset: all rules skip files whose source never mentions a configured errorset module (`@takinprofit/errorset` or `settings.errorset.modules`); those files couldn't produce reports. On a 76-file corpus with few errorset users, linting with the errorset plugin got 30% faster (88 → 62 ms, single-threaded). A module specifier spelled with escape sequences (`"\u0040takinprofit/errorset"`) is no longer recognized.
  - solidjs: the 16 JSX-only rules skip `.ts`, `.mts` and `.cts` files, which can't contain JSX. Lint results are unchanged.
- f2fbffe: README corrections. solidjs: `no-proxy-apis` and `no-array-handlers` are off in the `recommended` preset (the table said `error` and `warn`); corrected descriptions of `no-array-handlers`, `no-innerhtml` and `prefer-classlist`; new "Options" section documenting every rule option with its default. errorset: notes that files never mentioning a configured module are skipped.
- 6051ec5: - `components-return-once`: the fixes that rewrite early returns to `<Show>`, `<Switch>` and `<Match>` now add the missing `solid-js` imports, so the fixed file type-checks (previously the components were referenced without an import).
  - `no-unknown-namespaces`: options `{}` no longer abort the oxlint run with "Options validation failed" (the schema's `default: []` contradicted its own `minItems: 1`; the default is removed, `allowedNamespaces: []` is still rejected).
- 7c7f1f1: `reactivity`: the subtree walk for arguments of `use*`/`create*` calls is now iterative instead of recursive, so very deep JSX can't overflow the stack in the rule (ESLint on Bun parses 5,000 levels of nesting). Lint results are unchanged. The README documents oxlint's own nesting limits (about 1,900 nested JSX elements with JS plugins, about 5,000 for its parser).
- ebed8c2: Fixes found by running eslint-plugin-solid 0.14.5's own test suites against the rules (all 465 runnable cases now pass):
  
  - `imports`: no longer crashes when fixing into `import "solid-js"` or `import {} from "solid-js"`.
  - Static values are evaluated like upstream (string concatenation, unary minus, `const` resolution): `jsx-no-script-url` reports `"javascrip" + "t:..."`, `no-innerhtml` accepts concatenated static HTML, `style-prop` reports `'margin-top': -10`.
  - `style-prop`: vendor-prefixed properties (`-webkit-align-content`) are accepted and camelCase vendor names get the kebab-case message; the string-style fix drops declarations without a value.
  - README: `jsx-uses-vars` has no effect under oxlint (oxlint's `no-unused-vars` is native), so don't enable it in `.oxlintrc.json`; it stays in the ESLint `recommended` preset. Parity with upstream is documented in PARITY.md.
- 118fd0d: The package now ships `THIRD_PARTY_NOTICES.md` with the copyright and MIT license notice of the upstream ESLint plugin its rules are ported from (eslint-plugin-functional, eslint-plugin-no-type-assertion, @tanstack/eslint-plugin-query, @tanstack/eslint-plugin-router, eslint-plugin-solid), as the MIT license requires.
- e3ce3fa: Rules now declare their defaults in `meta.defaultOptions`, where oxlint, ESLint and documentation tools read them (they were previously in an ignored top-level `defaultOptions`). The declared values are the ones the rules already used, so lint results don't change. `immutable/immutable-data` now documents `ignoreImmediateMutation: false`, its actual default; the earlier declaration said `true` (eslint-plugin-functional's default) but was never applied.

## 0.2.0

### Minor Changes

- 7a18451: **Breaking:** every package now requires oxlint `>=1.70.0 <2` (declared as a peer dependency; ESLint `>=9` is an optional peer) and Node.js `^20.19.0 || >=22.12.0` (oxlint's own requirement; was `>=18`). The fallbacks for pre-1.52 `context.getSourceCode()` / `context.getScope()` were removed: rules use `context.sourceCode`, which oxlint >= 1.70 and ESLint 9 and 10 provide. READMEs document the tested range, the short rule names and the corrected `jsx-uses-vars` note (it works since oxlint 1.56).
  
  Migration:
  
  1. Upgrade oxlint to 1.70 or later (and Node.js to 20.19+ or 22.12+).
  2. In the same change, rename the plugin prefix from `oxlint-plugin-<name>/` to `<name>/` in `.oxlintrc.json` rule keys and in every `oxlint-disable` comment. Long-form disable comments are ignored by oxlint >= 1.70, and the short form doesn't exist before 1.70, so all three must change together.
- 78916e7: **Breaking:** the `recommended` presets now use the plugins' normalized names as rule prefixes, the prefix oxlint >= 1.70 uses (audit R15): `immutable/...` (was `functional/...`), `ts-no-assert/...` (was `no-type-assertion/...`), `solidjs/...` (was `solid/...`). The old prefixes matched neither the plugin name nor oxlint's, so the presets couldn't be used in oxlint at all.
  
  Migration (ESLint flat config): register the plugin under its normalized name when you spread the preset:
  
  ```js
  plugins: { immutable: immutablePlugin },      // was { functional: ... }
  plugins: { "ts-no-assert": tsNoAssertPlugin }, // was { "no-type-assertion": ... }
  plugins: { solidjs: solidPlugin },             // was { solid: ... }
  rules: plugin.configs.recommended.rules,
  ```
  
  Rename the same prefixes in any rule overrides and `eslint-disable` comments. In oxlint, use the short prefixes in `.oxlintrc.json` and in `oxlint-disable` comments (see the 0.2 migration guide).

### Patch Changes

- 51a8ceb: The ESLint-compatibility layer bundled into `dist/index.js` (`eslintCompatPlugin` from `@oxlint/plugins`) is upgraded from 1.43.0 to 1.93.0, which includes the `after`-hook ordering fixes from 1.44 and 1.58. No current rule uses `after`; bundles grow by about 2 KB.
- 23045ed: READMEs link the 0.2 migration guide (docs/migration-0.2.md), which lists every breaking change of this release and ships a dependency-free codemod (`migrate-0.2.ts`, Node >= 22.18 or Bun) that rewrites `oxlint-plugin-<name>/` to `<name>/` in disable comments and `.oxlintrc.json` rule keys. Migration: run `node migrate-0.2.ts .` and bump oxlint to >= 1.70 in the same commit.
- 51a8ceb: Package metadata: `repository` now points at github.com/g5becks/oxlint-plugins (with `directory`), plus `homepage` and `bugs`. The tarball includes `LICENSE` (MIT) and `CHANGELOG.md`, and `exports` adds `./package.json`.
- ae6dbc7: `jsx-no-undef`: per-file state is now reset for every file. Previously, once one file used a Solid component (e.g. `<Show>`) without importing it, every later file linted by the same worker was reported ("'Show' should be imported from 'solid-js'"), including `.ts` files without JSX, nondeterministically, and `--fix` inserted the import into those unrelated files. Affected oxlint and ESLint.
- 1732e94: `reactivity`: per-file state is now created for every file. The scope stack (including the `syncCallbacks` set, which kept AST nodes of every linted file alive for the lifetime of the worker or language server) and the solid-js import tracker lived in the rule's `createOnce` closure. Because the import tracker was never cleared, a Solid import seen in one file made a same-named local function in a later file count as a Solid primitive, producing false positives that depended on file order. `components-return-once` and `no-destructure` also reset their function stacks per file. Affected oxlint and ESLint.

## 0.1.1

### Initial Release

- First published version (no 0.1.0 was published): twenty SolidJS rules ported from eslint-plugin-solid and a `recommended` config.
- Tagged `oxlint-plugin-solidjs@0.1.1` (d4bcb7a). Published 2026-02-21T23:56:06Z. The npm bundle differs from a build of the tagged commit (the repository already contained unreleased changes); see the tag message.
