---
"oxlint-plugin-immutable": minor
---

`no-let` gains eslint-plugin-functional's `allowInFunctions` (allow `let` inside function bodies) and `ignoreIdentifierPattern` (skip a declaration when every declared name matches the pattern or patterns), both off by default, with the same behavior as eslint-plugin-functional 10.0.1. The README now maps every immutable rule's options to eslint-plugin-functional's, including `no-throw-statements`' `allowInAsyncFunctions` (upstream `allowToRejectPromises`, with narrower semantics) and `type-declaration-immutability`'s `identifiers` (an ignore pattern, equivalent to upstream `ignoreIdentifierPattern`). Not breaking: existing configs keep working unchanged.
