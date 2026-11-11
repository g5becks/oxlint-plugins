---
"oxlint-plugin-errorset": minor
"oxlint-plugin-immutable": minor
"oxlint-plugin-ts-no-assert": minor
"oxlint-plugin-query": minor
"oxlint-plugin-router": minor
"oxlint-plugin-solidjs": minor
---

**Breaking:** every package now requires oxlint `>=1.70.0 <2` (declared as a peer dependency; ESLint `>=9` is an optional peer) and Node.js `^20.19.0 || >=22.12.0` (oxlint's own requirement; was `>=18`). The fallbacks for pre-1.52 `context.getSourceCode()` / `context.getScope()` were removed: rules use `context.sourceCode`, which oxlint >= 1.70 and ESLint 9 and 10 provide. READMEs document the tested range, the short rule names and the corrected `jsx-uses-vars` note (it works since oxlint 1.56).

Migration:

1. Upgrade oxlint to 1.70 or later (and Node.js to 20.19+ or 22.12+).
2. In the same change, rename the plugin prefix from `oxlint-plugin-<name>/` to `<name>/` in `.oxlintrc.json` rule keys and in every `oxlint-disable` comment. Long-form disable comments are ignored by oxlint >= 1.70, and the short form doesn't exist before 1.70, so all three must change together.
