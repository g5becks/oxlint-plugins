# oxlint-plugin-router

## 0.2.1

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
- Tagged `oxlint-plugin-router@0.1.1` (d4bcb7a). Published 2026-02-21T23:06:24Z. The npm bundle differs from a build of the tagged commit (the repository already contained unreleased changes); see the tag message.

## 0.1.0

### Initial Release

- Initial release: `create-route-property-order` (ported from @tanstack/eslint-plugin-router) and the custom `route-param-names`, plus a `recommended` config.
- Published 2026-02-21T22:52:42Z, before this repository's history; not tagged.
