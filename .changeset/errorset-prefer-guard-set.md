---
"oxlint-plugin-errorset": patch
---

`prefer-guard-over-manual-kind-check` now suggests the guard of the set that narrowed the value (audit R4). With several sets in scope it used to suggest the first set declared in the file (for example `OrderError.not_found(r)` inside `if (UserError(r))`), which produced broken code. After `isErr(r)` the set is unknown, so the check is reported without a suggestion. Narrowing now follows the same forms as `no-unguarded-data-access`.
