---
"oxlint-plugin-solidjs": minor
---

New rule `no-cleanup-in-ref` (Solid 2.0, `settings.solidjs.version: 2` only; `error` in `recommended-v2`). Ref callbacks are unowned in 2.0, so the rule reports, inside a ref callback or a ref array:
- `onCleanup`, which throws;
- `getOwner()`, which returns `null`;
- primitives and `onSettled`, which are never disposed.
