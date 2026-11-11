---
"oxlint-plugin-solidjs": patch
---

- `components-return-once`: the fixes that rewrite early returns to `<Show>`, `<Switch>` and `<Match>` now add the missing `solid-js` imports, so the fixed file type-checks (previously the components were referenced without an import).
- `no-unknown-namespaces`: options `{}` no longer abort the oxlint run with "Options validation failed" (the schema's `default: []` contradicted its own `minItems: 1`; the default is removed, `allowedNamespaces: []` is still rejected).
