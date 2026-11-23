---
"oxlint-plugin-solidjs": minor
---

`imports` uses the Solid 2.0 module map at `settings.solidjs.version: 2`:
- `@solidjs/web` for `render`, `hydrate`, `dynamic`, `Portal`, … and the `JSX` type;
- `solid-js` for the store APIs.

It also migrates the import paths with an autofix:
- `solid-js/web` → `@solidjs/web`;
- `solid-js/store` → `solid-js`, merged into an existing import;
- `solid-js/h`, `solid-js/html`, `solid-js/universal` and the `jsx-runtime` entries.

It reports the removed `JSXElement` type. At version 2, a file's import fixes apply together in one `oxlint --fix` run. Version 1 is unchanged.
