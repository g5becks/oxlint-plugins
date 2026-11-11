---
"oxlint-plugin-errorset": patch
"oxlint-plugin-immutable": patch
"oxlint-plugin-ts-no-assert": patch
"oxlint-plugin-query": patch
"oxlint-plugin-router": patch
"oxlint-plugin-solidjs": patch
---

The ESLint-compatibility layer bundled into `dist/index.js` (`eslintCompatPlugin` from `@oxlint/plugins`) is upgraded from 1.43.0 to 1.93.0, which includes the `after`-hook ordering fixes from 1.44 and 1.58. No current rule uses `after`; bundles grow by about 2 KB.
