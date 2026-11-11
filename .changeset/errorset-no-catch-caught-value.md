---
"oxlint-plugin-errorset": patch
---

`no-catch-errorset` now only reports guards, `instanceof` checks and `.kind` access on the caught value (audit R5): the catch parameter, bindings of a destructured catch parameter, and variables assigned directly from them, resolved by scope. Guards on other values in a catch block (for example `const r = fallback(); if (UserError(r)) return r`) are no longer reported. Guards on the caught value inside callbacks in the catch block are now reported too.
