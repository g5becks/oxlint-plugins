---
"oxlint-plugin-solidjs": patch
---

`reactivity`: the subtree walk for arguments of `use*`/`create*` calls is now iterative instead of recursive, so very deep JSX can't overflow the stack in the rule (ESLint on Bun parses 5,000 levels of nesting). Lint results are unchanged. The README documents oxlint's own nesting limits (about 1,900 nested JSX elements with JS plugins, about 5,000 for its parser).
