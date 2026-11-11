---
"oxlint-plugin-errorset": patch
"oxlint-plugin-query": patch
"oxlint-plugin-router": patch
---

README examples use the normalized rule prefixes (`errorset/...`, `query/...`, `router/...`) that oxlint >= 1.70 uses. The `recommended` presets already used these prefixes and are now generated from the same name map; they are tested in oxlint 1.70 and the pinned version and in ESLint 9.
