---
"oxlint-plugin-solidjs": minor
---

New rule `for-keyed-literal` (Solid 2.0, `settings.solidjs.version: 2` only; `warn` in `recommended-v2`) reports a dynamic boolean `keyed` (a call, `!x`, a comparison, a logical expression or a conditional) on `<For>` or `mapArray` with function children. In 2.0 the callback's argument shapes depend on the keying mode.
