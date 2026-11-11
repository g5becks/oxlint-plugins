# oxlint-plugin-ts-no-assert

## 0.1.2

### Patch Changes

- `no-type-assertion`: accept oxlint's AST shape for `as const` (`TSTypeOperator` `const`), which was reported as an assertion under oxlint.
- Tagged `oxlint-plugin-ts-no-assert@0.1.2` (d4bcb7a). Published 2026-02-22T22:12:45Z.

## 0.1.1

### Initial Release

- First published version: `no-type-assertion` (disallows `as`, `<T>` and non-null `!` assertions; allows `as const` and `as unknown`), ported from eslint-plugin-no-type-assertion.
- Published 2026-02-21T23:56:09Z, before this repository's history; not tagged.
