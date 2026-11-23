---
"oxlint-plugin-solidjs": minor
---

New rule `reconcile-key` (Solid 2.0, `settings.solidjs.version: 2` only; `warn` in `recommended-v2`).
- `reconcile(value)` without a key is reported: 2.0 matches items by `"id"` by default, which silently mismatches data keyed by `_id`. Suggestions: `"id"` or `null`.
- The 1.x `{ key }` options object is autofixed into the key argument.
- `merge: false` is reported: there's no 2.0 equivalent.
