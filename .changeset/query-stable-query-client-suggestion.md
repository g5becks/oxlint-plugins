---
"oxlint-plugin-query": minor
---

**Behavior change** in `stable-query-client`: when the file imports neither `useState` nor a React namespace from `react`, the rule still reports but no longer autofixes to `React.useState(...)` (that fix referenced an undefined `React` unless one was global). It offers the same rewrite as a suggestion instead. Files that import `useState` (also aliased) or `React` / `* as R` keep the autofix, using the local name.

Migration: nothing to change in config. If you relied on `oxlint --fix` for files without a React import, add `import { useState } from "react"` (the autofix then applies) or apply the suggestion in your editor. See PARITY.md#query-stable-query-client-no-react-import.
