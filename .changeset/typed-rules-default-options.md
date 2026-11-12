---
"oxlint-plugin-immutable": patch
"oxlint-plugin-solidjs": patch
---

Rules now declare their defaults in `meta.defaultOptions`, where oxlint, ESLint and documentation tools read them (they were previously in an ignored top-level `defaultOptions`). The declared values are the ones the rules already used, so lint results don't change. `immutable/immutable-data` now documents `ignoreImmediateMutation: false`, its actual default; the earlier declaration said `true` (eslint-plugin-functional's default) but was never applied.
