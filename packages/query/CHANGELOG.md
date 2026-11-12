# oxlint-plugin-query

## 0.3.0

### Minor Changes

- 6051ec5: **Behavior change** in `stable-query-client`: when the file imports neither `useState` nor a React namespace from `react`, the rule still reports but no longer autofixes to `React.useState(...)` (that fix referenced an undefined `React` unless one was global). It offers the same rewrite as a suggestion instead. Files that import `useState` (also aliased) or `React` / `* as R` keep the autofix, using the local name.
  
  Migration: nothing to change in config. If you relied on `oxlint --fix` for files without a React import, add `import { useState } from "react"` (the autofix then applies) or apply the suggestion in your editor. See PARITY.md#query-stable-query-client-no-react-import.
- 5498c62: `exhaustive-deps` now reports on the `useQuery({ ... })` options object instead of the `queryKey` property, like upstream `@tanstack/eslint-plugin-query` 5.107+ (audit R12), so editor squiggles and `oxlint-disable-next-line` placement match upstream. Migration: a `// oxlint-disable-next-line query/exhaustive-deps` comment placed above the `queryKey` line must move above the line that opens the options object (usually `useQuery({`). `no-unstable-deps` also tracks aliased React hooks imported from `"React"`, as upstream does (in addition to `"react"`). The upstream test suites now run against the ports; differences are listed in PARITY.md; `stable-query-client` is documented as React-only.

### Patch Changes

- 118fd0d: The package now ships `THIRD_PARTY_NOTICES.md` with the copyright and MIT license notice of the upstream ESLint plugin its rules are ported from (eslint-plugin-functional, eslint-plugin-no-type-assertion, @tanstack/eslint-plugin-query, @tanstack/eslint-plugin-router, eslint-plugin-solid), as the MIT license requires.

## 0.2.0

### Minor Changes

- 7a18451: **Breaking:** every package now requires oxlint `>=1.70.0 <2` (declared as a peer dependency; ESLint `>=9` is an optional peer) and Node.js `^20.19.0 || >=22.12.0` (oxlint's own requirement; was `>=18`). The fallbacks for pre-1.52 `context.getSourceCode()` / `context.getScope()` were removed: rules use `context.sourceCode`, which oxlint >= 1.70 and ESLint 9 and 10 provide. READMEs document the tested range, the short rule names and the corrected `jsx-uses-vars` note (it works since oxlint 1.56).
  
  Migration:
  
  1. Upgrade oxlint to 1.70 or later (and Node.js to 20.19+ or 22.12+).
  2. In the same change, rename the plugin prefix from `oxlint-plugin-<name>/` to `<name>/` in `.oxlintrc.json` rule keys and in every `oxlint-disable` comment. Long-form disable comments are ignored by oxlint >= 1.70, and the short form doesn't exist before 1.70, so all three must change together.

### Patch Changes

- 51a8ceb: The ESLint-compatibility layer bundled into `dist/index.js` (`eslintCompatPlugin` from `@oxlint/plugins`) is upgraded from 1.43.0 to 1.93.0, which includes the `after`-hook ordering fixes from 1.44 and 1.58. No current rule uses `after`; bundles grow by about 2 KB.
- 23045ed: READMEs link the 0.2 migration guide (docs/migration-0.2.md), which lists every breaking change of this release and ships a dependency-free codemod (`migrate-0.2.ts`, Node >= 22.18 or Bun) that rewrites `oxlint-plugin-<name>/` to `<name>/` in disable comments and `.oxlintrc.json` rule keys. Migration: run `node migrate-0.2.ts .` and bump oxlint to >= 1.70 in the same commit.
- 51a8ceb: Package metadata: `repository` now points at github.com/g5becks/oxlint-plugins (with `directory`), plus `homepage` and `bugs`. The tarball includes `LICENSE` (MIT) and `CHANGELOG.md`, and `exports` adds `./package.json`.
- 78916e7: README examples use the normalized rule prefixes (`errorset/...`, `query/...`, `router/...`) that oxlint >= 1.70 uses. The `recommended` presets already used these prefixes and are now generated from the same name map; they are tested in oxlint 1.70 and the pinned version and in ESLint 9.

## 0.1.1

### Patch Changes

- Republished with no code change (bundle identical to 0.1.0).
- Tagged `oxlint-plugin-query@0.1.1` (d4bcb7a). Published 2026-02-21T23:06:26Z. The npm bundle differs from a build of the tagged commit (the repository already contained unreleased changes); see the tag message.

## 0.1.0

### Initial Release

- Initial release: six TanStack Query rules ported from @tanstack/eslint-plugin-query (`exhaustive-deps`, `infinite-query-property-order`, `mutation-property-order`, `no-rest-destructuring`, `no-unstable-deps`, `stable-query-client`) and a `recommended` config.
- Published 2026-02-21T22:52:44Z, before this repository's history; not tagged.
