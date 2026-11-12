---
"oxlint-plugin-errorset": patch
---

Internal: the five errorset rules share one import tracker per file instead of running five, using the per-file shared-cache pattern documented by `@oxlint/plugins` (acquire in `before()`, release in `after()`). Lint results are unchanged; there is no measurable speed difference.
