---
"oxlint-plugin-solidjs": patch
---

`imports`' autofix keeps the `type` modifier when it merges a type-only import into a value import. `import type { Component } from "solid-js/store"` merged into `import { createSignal } from "solid-js"` now gives `import { createSignal, type Component } from "solid-js"`, which compiles under `verbatimModuleSyntax` too. This intentionally diverges from eslint-plugin-solid 0.14.5 (see PARITY.md).
