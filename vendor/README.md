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

`licenses/` holds upstream license files that aren't otherwise in the repo or `node_modules`, for
`scripts/third-party-notices.ts`: `licenses/eslint-plugin-no-type-assertion@1.3.0/LICENSE` is the
`LICENSE` file from the npm tarball `eslint-plugin-no-type-assertion@1.3.0` (`npm pack`, sha256
`b94c6e55adeb2ecd1cb509cb9b58c72ca4ccf4caa1c2c38744266d4c3fc9d8d0`), identical to the repository's
(github.com/Dremora/eslint-plugin-no-type-assertion).
