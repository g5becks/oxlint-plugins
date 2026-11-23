---
"oxlint-plugin-solidjs": minor
---

`no-destructure` no longer generates the removed `splitProps`/`mergeProps` at `settings.solidjs.version: 2`.
- A rest element is fixed with `omit(props, ...keys)`, imported from `solid-js`.
- Defaults are reported without a fix: `merge` treats an explicit `undefined` as a value, unlike a destructuring default.

Version 1 is unchanged.
