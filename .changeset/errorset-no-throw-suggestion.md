---
"oxlint-plugin-errorset": minor
---

**Breaking:** `no-throw-errorset` no longer has an autofix. Its `throw` -> `return` fix was applied by plain `oxlint --fix` and changed runtime behavior inside callbacks (`ids.map((id) => { throw ... })` started returning error values into the array) and `try`/`finally`. The rule now offers a suggestion (`hasSuggestions`) instead, and only when the `throw` is directly in the body of a non-callback function (only blocks and `if`/`else` in between); inside callbacks, loops, `switch` and `try`/`catch`/`finally` it reports without a suggestion.

Migration: nothing to configure. If you relied on `oxlint --fix` to rewrite these throws, apply the suggestion in your editor (or rewrite by hand) and review each site; throws inside callbacks, loops, `switch` and `try` blocks need a manual restructuring.
