---
"oxlint-plugin-errorset": patch
---

`no-unguarded-data-access` now resolves variables through scope analysis and understands more narrowing (audit R2). Fixed false positives: guard clauses (`if (!UserError(r)) return ...; r.data`), ternaries (`UserError(r) ? r.data : ...`), `G(r) && r.data`, `!G(r) || r.data`, `else` branches of negated guards, and a same-named variable in another function. Fixed false negative: an access before the first guard call is now reported (results no longer depend on traversal order).
