---
"oxlint-plugin-solidjs": minor
---

`prefer-for` follows Solid 2.0 at `settings.solidjs.version: 2`: it no longer suggests the removed `<Index>`, and two-parameter maps name `<For>` and `<For keyed={false}>`. Count-based lists in JSX (`Array.from({ length: n }, fn)`, `[...Array(n)].map(fn)`, `Array(n).fill(x).map(fn)`) suggest `<Repeat count={n}>`. Version 1 is unchanged.
