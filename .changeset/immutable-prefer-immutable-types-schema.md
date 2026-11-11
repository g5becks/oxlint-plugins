---
"oxlint-plugin-immutable": minor
---

**Breaking (config):** `prefer-immutable-types` now validates its per-category options. `parameters`, `returnTypes` and `variables` accept only `enforcement` (`"ReadonlyShallow"`, or `"None"` / `false` to turn the category off) and `ignoreNamePattern` (string or array of strings). Previously any object was accepted, and upstream-only values such as `enforcement: "Immutable"` silently disabled the category; now oxlint stops with "Options validation failed for rule 'immutable/prefer-immutable-types'".

Migration: replace `enforcement: "Immutable"` / `"ReadonlyDeep"` with `"ReadonlyShallow"` (the only level implemented without type information) or `"None"` to keep the category off as before, and remove other upstream keys (`ignoreInferredTypes`, `ignoreClasses`, `fixer`, `suggestions`, ...) from the category objects.
