# Vendored upstream code

Unmodified copies of the ESLint plugins that the oxlint ports follow, kept for reference, diffs and
upstream test suites. Nothing in this directory is built, shipped, type-checked or linted. Each
`<package>@<version>/README.md` records the upstream repository, version, commit, license and the
evidence for that version.

| Directory | Ported by |
|---|---|
| `@tanstack/eslint-plugin-query@5.91.4/` | `packages/query` |
| `eslint-plugin-solid@0.14.5/` | `packages/solidjs` |

`packages/router` ports `create-route-property-order` from `@tanstack/eslint-plugin-router`
(no vendored copy); `route-param-names` is a custom rule.
