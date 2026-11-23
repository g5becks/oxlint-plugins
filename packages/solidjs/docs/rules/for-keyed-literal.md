# solidjs/for-keyed-literal

Disallows a dynamic boolean `keyed` on `<For>` (and `mapArray`) when the children are a function.

**Version 2 only:** the rule reports nothing unless `settings.solidjs.version` is `2`.

Sources: MIGRATION §List rendering ("Prefer literal `keyed` modes for function children. A dynamic
boolean `keyed={condition()}` makes the callback shape ambiguous."); RFC 03 §List rendering, notes
([solidjs/solid@cd201ce](https://github.com/solidjs/solid/tree/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0)).

The callback's argument shapes depend on the mode:

| `keyed` | item | index |
|---|---|---|
| absent or `true` | raw value | accessor |
| `false` | accessor | number |
| `(item) => key` | accessor | accessor |

**Reported:** calls (`keyed={byIndex()}`), `!x`, comparisons, logical expressions and conditionals.

**Valid:** a literal, a bare `keyed`, an inline key function, and identifiers or member expressions
(they may hold a key function). Elements without function children aren't checked, and neither is
`mapArray(list, fn, { keyed })` with a literal or function `keyed`.

There is no autofix: which mode is right is the author's choice.
