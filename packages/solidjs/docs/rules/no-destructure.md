# solidjs/no-destructure

Disallows destructuring props in a component's parameter list, which breaks reactivity.

- **Version 1** (the default): unchanged from
  [eslint-plugin-solid 0.14.5](https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-destructure.md).
  The fix rewrites reads to `props.x`, and uses `splitProps` / `mergeProps` for rest elements and
  defaults.
- **Version 2** (`settings.solidjs.version: 2`): Solid 2.0 removed `splitProps` and `mergeProps`
  (MIGRATION §mergeProps / splitProps → merge / omit). 2.0 itself warns on destructured props
  (MIGRATION §"Top-level reactive read").

| Version-2 case | Fix |
|---|---|
| `({ title }) => ...` | `(props) => ...` with `props.title`, as in 1.x |
| `({ label, ...rest }) => ...` | `(props) => { const rest = omit(props, "label"); ... }`, adding `omit` to the `solid-js` import (RFC 04 §omit) |
| any default (`{ size = "m" }`) | none, reported as `noDestructureDefaults` |

Defaults aren't fixed because the 2.0 replacement isn't equivalent. `merge({ size: "m" }, props)`
treats an explicit `undefined` as a value (RFC 04 §merge), while a destructuring default applies
whenever the value is `undefined`. A caller passing `size={undefined}` would get `undefined` instead
of `"m"`. Rewrite these by hand, and check callers that pass `undefined`.
