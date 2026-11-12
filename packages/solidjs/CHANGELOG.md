# oxlint-plugin-solidjs

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
