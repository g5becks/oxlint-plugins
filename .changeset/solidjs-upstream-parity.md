---
"oxlint-plugin-solidjs": patch
---

Fixes found by running eslint-plugin-solid 0.14.5's own test suites against the rules (all 465 runnable cases now pass):

- `imports`: no longer crashes when fixing into `import "solid-js"` or `import {} from "solid-js"`.
- Static values are evaluated like upstream (string concatenation, unary minus, `const` resolution): `jsx-no-script-url` reports `"javascrip" + "t:..."`, `no-innerhtml` accepts concatenated static HTML, `style-prop` reports `'margin-top': -10`.
- `style-prop`: vendor-prefixed properties (`-webkit-align-content`) are accepted and camelCase vendor names get the kebab-case message; the string-style fix drops declarations without a value.
- README: `jsx-uses-vars` has no effect under oxlint (oxlint's `no-unused-vars` is native), so don't enable it in `.oxlintrc.json`; it stays in the ESLint `recommended` preset. Parity with upstream is documented in PARITY.md.
