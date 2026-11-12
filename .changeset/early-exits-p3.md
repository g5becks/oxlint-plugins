---
"oxlint-plugin-errorset": patch
"oxlint-plugin-solidjs": patch
---

Per-file early exits (rules return `false` from `before()`, which makes oxlint skip them for that file):

- errorset: all rules skip files whose source never mentions a configured errorset module (`@takinprofit/errorset` or `settings.errorset.modules`); those files couldn't produce reports. On a 76-file corpus with few errorset users, linting with the errorset plugin got 30% faster (88 → 62 ms, single-threaded). A module specifier spelled with escape sequences (`"\u0040takinprofit/errorset"`) is no longer recognized.
- solidjs: the 16 JSX-only rules skip `.ts`, `.mts` and `.cts` files, which can't contain JSX. Lint results are unchanged.
