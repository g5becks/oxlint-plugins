# solidjs/reconcile-key

Requires an explicit key for Solid 2.0's `reconcile`.

**Version 2 only:** the rule reports nothing unless `settings.solidjs.version` is `2`.

Source: RFC 04 §reconcile(value, key?); solid-js 2.0.3 `store/index.d.ts`,
`reconcile(value, key?: string | ((item) => any) | null)`
([solidjs/solid@cd201ce](https://github.com/solidjs/solid/tree/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0)).

`reconcile` matches items by key, `"id"` by default, and `null` matches by position. Data keyed by
something else (`_id`, `uuid`) silently mismatches: rows are diffed as if every item changed,
losing identity. The key is a data decision, so a missing key isn't autofixed.

| Code | Report | Fix |
|---|---|---|
| `reconcile(value)` | `missingKey` | suggestions: `reconcile(value, "id")` (makes today's default explicit, behavior-preserving) and `reconcile(value, null)` (positional) |
| `reconcile(value, { key: "_id" })` (1.x options) | `optionsObject` | autofix `reconcile(value, "_id")`, when the key is a string or `null` literal and `merge` is absent or `true`: merge semantics are always on in 2.0 |
| `reconcile(value, { merge: true })` | `missingKey` | the same suggestions |
| `reconcile(value, { ..., merge: false })` | `mergeFalse`: no 2.0 equivalent | none |
| `reconcile(value, opts)` (an options object in a variable) | `optionsObject` | none |

Only `reconcile` imported from `solid-js` (or `solid-js/store`) is checked.
