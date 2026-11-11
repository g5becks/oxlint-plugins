---
"oxlint-plugin-query": minor
---

`exhaustive-deps` now reports on the `useQuery({ ... })` options object instead of the `queryKey` property, like upstream `@tanstack/eslint-plugin-query` 5.107+ (audit R12), so editor squiggles and `oxlint-disable-next-line` placement match upstream. Migration: a `// oxlint-disable-next-line query/exhaustive-deps` comment placed above the `queryKey` line must move above the line that opens the options object (usually `useQuery({`). `no-unstable-deps` also tracks aliased React hooks imported from `"React"`, as upstream does (in addition to `"react"`). The upstream test suites now run against the ports; differences are listed in PARITY.md; `stable-query-client` is documented as React-only.
