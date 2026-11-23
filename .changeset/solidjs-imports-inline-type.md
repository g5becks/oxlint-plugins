---
"oxlint-plugin-solidjs": patch
---

Fix `imports`' autofix for inline type specifiers. Moving `import { type JSX, render } from "solid-js/web"` produced `import type { type JSX } from "solid-js"`, which TypeScript rejects (TS2206). It now produces `import { type JSX } from "solid-js"`, and drops the redundant modifier when merging into an existing `import type` declaration.
