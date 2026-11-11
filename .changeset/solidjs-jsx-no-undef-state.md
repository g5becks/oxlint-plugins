---
"oxlint-plugin-solidjs": patch
---

`jsx-no-undef`: per-file state is now reset for every file. Previously, once one file used a Solid component (e.g. `<Show>`) without importing it, every later file linted by the same worker was reported ("'Show' should be imported from 'solid-js'"), including `.ts` files without JSX, nondeterministically, and `--fix` inserted the import into those unrelated files. Affected oxlint and ESLint.
