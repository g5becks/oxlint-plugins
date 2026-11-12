# oxlint-plugin-immutable

## 0.3.0

### Minor Changes

- dd26164: `no-let` gains eslint-plugin-functional's `allowInFunctions` (allow `let` inside function bodies) and `ignoreIdentifierPattern` (skip a declaration when every declared name matches the pattern or patterns), both off by default, with the same behavior as eslint-plugin-functional 10.0.1. The README now maps every immutable rule's options to eslint-plugin-functional's, including `no-throw-statements`' `allowInAsyncFunctions` (upstream `allowToRejectPromises`, with narrower semantics) and `type-declaration-immutability`'s `identifiers` (an ignore pattern, equivalent to upstream `ignoreIdentifierPattern`). Not breaking: existing configs keep working unchanged.
- 6051ec5: **Breaking (config):** `prefer-immutable-types` now validates its per-category options. `parameters`, `returnTypes` and `variables` accept only `enforcement` (`"ReadonlyShallow"`, or `"None"` / `false` to turn the category off) and `ignoreNamePattern` (string or array of strings). Previously any object was accepted, and upstream-only values such as `enforcement: "Immutable"` silently disabled the category; now oxlint stops with "Options validation failed for rule 'immutable/prefer-immutable-types'".
  
  Migration: replace `enforcement: "Immutable"` / `"ReadonlyDeep"` with `"ReadonlyShallow"` (the only level implemented without type information) or `"None"` to keep the category off as before, and remove other upstream keys (`ignoreInferredTypes`, `ignoreClasses`, `fixer`, `suggestions`, ...) from the category objects.
- 5684a6b: `type-declaration-immutability` now checks union members, top-level arrays and tuples (`T[]`, `Array<T>`, `[A, B]`), mapped types without `readonly`, index signatures, `Map`/`Set`/`WeakMap`/`WeakSet`/`Record`, and `Partial`/`Required`/`Pick`/`Omit`/`NonNullable` over a literal (audit R7); previously only object literals, intersections and interfaces were checked. `{ readonly items: string[] }` is now accepted (ReadonlyShallow, as upstream). On a 22-declaration probe the rule now agrees with upstream eslint-plugin-functional 10.0.1 on 22 of 22 (was 13).
  
  **This reports more declarations.** Migration: make them readonly (`readonly T[]`, `ReadonlyArray<T>`, `readonly [A, B]`, `ReadonlyMap`, `ReadonlySet`, `Readonly<Record<K, V>>`, `{ readonly [K in X]: T }`) or suppress with `// oxlint-disable-next-line immutable/type-declaration-immutability`. The README lists what the rule can't see without type information.

### Patch Changes

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

## 0.1.1

### Initial Release

- First published version (no 0.1.0 was published): eight immutability rules ported from eslint-plugin-functional (`no-let`, `no-throw-statements`, `no-promise-reject`, `immutable-data`, `prefer-immutable-types`, `prefer-property-signatures`, `readonly-type`, `type-declaration-immutability`) and a `recommended` config.
- Tagged `oxlint-plugin-immutable@0.1.1` (d4bcb7a). Published 2026-02-21T23:26:59Z. The npm bundle differs from a build of the tagged commit (the repository already contained unreleased changes); see the tag message.
