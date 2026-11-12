# oxlint-plugin-errorset

## 0.2.1

### Patch Changes

- 58a58df: Per-file early exits (rules return `false` from `before()`, which makes oxlint skip them for that file):
  
  - errorset: all rules skip files whose source never mentions a configured errorset module (`@takinprofit/errorset` or `settings.errorset.modules`); those files couldn't produce reports. On a 76-file corpus with few errorset users, linting with the errorset plugin got 30% faster (88 → 62 ms, single-threaded). A module specifier spelled with escape sequences (`"\u0040takinprofit/errorset"`) is no longer recognized.
  - solidjs: the 16 JSX-only rules skip `.ts`, `.mts` and `.cts` files, which can't contain JSX. Lint results are unchanged.
- 7472057: Internal: the five errorset rules share one import tracker per file instead of running five, using the per-file shared-cache pattern documented by `@oxlint/plugins` (acquire in `before()`, release in `after()`). Lint results are unchanged; there is no measurable speed difference.
- f2fbffe: README corrections. solidjs: `no-proxy-apis` and `no-array-handlers` are off in the `recommended` preset (the table said `error` and `warn`); corrected descriptions of `no-array-handlers`, `no-innerhtml` and `prefer-classlist`; new "Options" section documenting every rule option with its default. errorset: notes that files never mentioning a configured module are skipped.

## 0.2.0

### Minor Changes

- 9314f14: Support `@takinprofit/errorset` 0.4 and 0.5 patterns (0.3 patterns keep working):
  
  - `throw X.kind`msg`.with({ cause })` is reported by `no-throw-errorset`.
  - Object-form sets (`errorSet("X", { kind: ["key"] })`) are recognized.
  - Merged guards (`merge(A, B)`, `A.merge(B)`) are set-level guards: they narrow, are checked in `catch`, and never get a kind-guard suggestion.
  - `err.set === "X"` narrows to set `X`; `prefer-guard-over-manual-kind-check` then suggests `X.<kind>(err)`.
  - Set members (`recover`, `inspect`, `merge`, `capture`, `captureAsync`, `from`, `kinds`) are no longer mistaken for kind guards (for example `X.from(body)` no longer marks `body` as an error).
  - Throwing inside top-level `captureSync`/`captureAsync` targets is not reported; `throw toError(err)` is not reported.
  - `no-new-error-in-errorset-fn` also reports `return new Error(...)` (audit R6), which may surface new warnings.
- bd273e5: **Breaking:** `no-throw-errorset` no longer has an autofix. Its `throw` -> `return` fix was applied by plain `oxlint --fix` and changed runtime behavior inside callbacks (`ids.map((id) => { throw ... })` started returning error values into the array) and `try`/`finally`. The rule now offers a suggestion (`hasSuggestions`) instead, and only when the `throw` is directly in the body of a non-callback function (only blocks and `if`/`else` in between); inside callbacks, loops, `switch` and `try`/`catch`/`finally` it reports without a suggestion.
  
  Migration: nothing to configure. If you relied on `oxlint --fix` to rewrite these throws, apply the suggestion in your editor (or rewrite by hand) and review each site; throws inside callbacks, loops, `switch` and `try` blocks need a manual restructuring.
- 5403c0c: New `settings.errorset` (`modules`, `guardPattern`): error sets re-exported from your own modules (for example `import { UserError } from "@acme/core"`) are now recognized by all five rules. Previously every rule was silent unless the file imported `@takinprofit/errorset` directly and defined the set in the same file. Without the setting, behavior is unchanged. Type-only and namespace imports are not treated as guards; invalid settings are ignored. Enabling the setting can surface new reports; see the README.
- 7a18451: **Breaking:** every package now requires oxlint `>=1.70.0 <2` (declared as a peer dependency; ESLint `>=9` is an optional peer) and Node.js `^20.19.0 || >=22.12.0` (oxlint's own requirement; was `>=18`). The fallbacks for pre-1.52 `context.getSourceCode()` / `context.getScope()` were removed: rules use `context.sourceCode`, which oxlint >= 1.70 and ESLint 9 and 10 provide. READMEs document the tested range, the short rule names and the corrected `jsx-uses-vars` note (it works since oxlint 1.56).
  
  Migration:
  
  1. Upgrade oxlint to 1.70 or later (and Node.js to 20.19+ or 22.12+).
  2. In the same change, rename the plugin prefix from `oxlint-plugin-<name>/` to `<name>/` in `.oxlintrc.json` rule keys and in every `oxlint-disable` comment. Long-form disable comments are ignored by oxlint >= 1.70, and the short form doesn't exist before 1.70, so all three must change together.

### Patch Changes

- 51a8ceb: The ESLint-compatibility layer bundled into `dist/index.js` (`eslintCompatPlugin` from `@oxlint/plugins`) is upgraded from 1.43.0 to 1.93.0, which includes the `after`-hook ordering fixes from 1.44 and 1.58. No current rule uses `after`; bundles grow by about 2 KB.
- d943d09: `no-catch-errorset` now only reports guards, `instanceof` checks and `.kind` access on the caught value (audit R5): the catch parameter, bindings of a destructured catch parameter, and variables assigned directly from them, resolved by scope. Guards on other values in a catch block (for example `const r = fallback(); if (UserError(r)) return r`) are no longer reported. Guards on the caught value inside callbacks in the catch block are now reported too.
- 7ca1b1c: `prefer-guard-over-manual-kind-check` now suggests the guard of the set that narrowed the value (audit R4). With several sets in scope it used to suggest the first set declared in the file (for example `OrderError.not_found(r)` inside `if (UserError(r))`), which produced broken code. After `isErr(r)` the set is unknown, so the check is reported without a suggestion. Narrowing now follows the same forms as `no-unguarded-data-access`.
- 8f4b0d9: `no-unguarded-data-access` now resolves variables through scope analysis and understands more narrowing (audit R2). Fixed false positives: guard clauses (`if (!UserError(r)) return ...; r.data`), ternaries (`UserError(r) ? r.data : ...`), `G(r) && r.data`, `!G(r) || r.data`, `else` branches of negated guards, and a same-named variable in another function. Fixed false negative: an access before the first guard call is now reported (results no longer depend on traversal order).
- 23045ed: READMEs link the 0.2 migration guide (docs/migration-0.2.md), which lists every breaking change of this release and ships a dependency-free codemod (`migrate-0.2.ts`, Node >= 22.18 or Bun) that rewrites `oxlint-plugin-<name>/` to `<name>/` in disable comments and `.oxlintrc.json` rule keys. Migration: run `node migrate-0.2.ts .` and bump oxlint to >= 1.70 in the same commit.
- 51a8ceb: Package metadata: `repository` now points at github.com/g5becks/oxlint-plugins (with `directory`), plus `homepage` and `bugs`. The tarball includes `LICENSE` (MIT) and `CHANGELOG.md`, and `exports` adds `./package.json`.
- 78916e7: README examples use the normalized rule prefixes (`errorset/...`, `query/...`, `router/...`) that oxlint >= 1.70 uses. The `recommended` presets already used these prefixes and are now generated from the same name map; they are tested in oxlint 1.70 and the pinned version and in ESLint 9.

## 0.1.1

### Patch Changes

- Added the package README. No code change (the bundle is identical to 0.1.0 apart from bundler identifier renaming).
- Tagged `oxlint-plugin-errorset@0.1.1` (f1287ad). Published 2026-02-22T22:53:51Z.

## 0.1.0

### Initial Release

- Initial release: five rules enforcing correct use of `@takinprofit/errorset` (`no-throw-errorset`, `no-catch-errorset`, `no-new-error-in-errorset-fn`, `prefer-guard-over-manual-kind-check`, `no-unguarded-data-access`) and a `recommended` config.
- Tagged `oxlint-plugin-errorset@0.1.0` (d4bcb7a). Published 2026-02-22T22:12:48Z.
