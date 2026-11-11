---
"oxlint-plugin-solidjs": patch
---

`reactivity`: per-file state is now created for every file. The scope stack (including the `syncCallbacks` set, which kept AST nodes of every linted file alive for the lifetime of the worker or language server) and the solid-js import tracker lived in the rule's `createOnce` closure. Because the import tracker was never cleared, a Solid import seen in one file made a same-named local function in a later file count as a Solid primitive, producing false positives that depended on file order. `components-return-once` and `no-destructure` also reset their function stacks per file. Affected oxlint and ESLint.
