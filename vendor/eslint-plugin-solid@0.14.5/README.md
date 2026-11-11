# Vendored: eslint-plugin-solid 0.14.5

Unmodified upstream source of the ESLint plugin that `packages/solidjs` ports to oxlint. Reference
only: nothing here is built, shipped or type-checked, and nothing in `packages/` imports it.

| | |
|---|---|
| Upstream | https://github.com/solidjs-community/eslint-plugin-solid, `packages/eslint-plugin-solid/src` |
| Version | `eslint-plugin-solid@0.14.5` (git tag `v0.14.5`) |
| Commit | `8409ccbe97daec892bd4d753c031030135cd35b7` |
| License | MIT, Copyright (c) 2021 Josh Wilson (see `LICENSE`) |

**Evidence the port follows this version** (recorded 2026-11-11, TASK-021): compared with the
`src/` of each tag from v0.14.4 to v0.19.0, the previously vendored copy differed from v0.14.5 by
one line (an added `additionalProperties: false` in `jsx-no-duplicate-props`' schema, now
reverted so this copy is pristine) and from every later tag by 266 (v0.15.0) to 1,642 (v0.19.0)
lines; all other files were identical to v0.14.5. Upstream's tests are not vendored here (the npm
package ships only `dist/`).

Note: the audit compared the port's behavior with `eslint-plugin-solid@0.19.0`; the port's source
follows 0.14.5.
