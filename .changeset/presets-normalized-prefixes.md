---
"oxlint-plugin-immutable": minor
"oxlint-plugin-ts-no-assert": minor
"oxlint-plugin-solidjs": minor
---

**Breaking:** the `recommended` presets now use the plugins' normalized names as rule prefixes, the prefix oxlint >= 1.70 uses (audit R15): `immutable/...` (was `functional/...`), `ts-no-assert/...` (was `no-type-assertion/...`), `solidjs/...` (was `solid/...`). The old prefixes matched neither the plugin name nor oxlint's, so the presets couldn't be used in oxlint at all.

Migration (ESLint flat config): register the plugin under its normalized name when you spread the preset:

```js
plugins: { immutable: immutablePlugin },      // was { functional: ... }
plugins: { "ts-no-assert": tsNoAssertPlugin }, // was { "no-type-assertion": ... }
plugins: { solidjs: solidPlugin },             // was { solid: ... }
rules: plugin.configs.recommended.rules,
```

Rename the same prefixes in any rule overrides and `eslint-disable` comments. In oxlint, use the short prefixes in `.oxlintrc.json` and in `oxlint-disable` comments (see the 0.2 migration guide).
