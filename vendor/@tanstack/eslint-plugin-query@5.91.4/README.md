# Vendored: @tanstack/eslint-plugin-query 5.91.4

Unmodified upstream source of the ESLint plugin that `packages/query` ports to oxlint. Reference
only: nothing here is built, shipped or type-checked, and nothing in `packages/` imports it.

| | |
|---|---|
| Upstream | https://github.com/TanStack/query, `packages/eslint-plugin-query/src` |
| Version | `@tanstack/eslint-plugin-query@5.91.4` (npm, published 2026-01-30) |
| Commit | `a678f0957cff5e2cf4efa26dbbeb0747e3bbee6d` (tag `@tanstack/eslint-plugin-query@5.91.4`) |
| License | MIT, Copyright (c) 2021-present Tanner Linsley (see `LICENSE`) |

**Evidence the port follows this version** (recorded 2026-11-11, TASK-021): `src/` (rules, utils,
index.ts, rules.ts, types.ts) is byte-identical to the `src/` in the npm tarballs of 5.91.3 and
5.91.4 (those two are identical; 5.91.2 differs by 43 lines, 5.91.5 by 201, 5.107.1 by 1,371), and
`src/__tests__/` is byte-identical to the tag of 5.91.4, while 5.91.3's `no-void-query-fn.test.ts`
differs by 178 lines. The tests were previously stored as `_tests_upstream/*.upstream.ts`; they have
their upstream names again.

`no-void-query-fn` has no oxlint port (it needs type information).
