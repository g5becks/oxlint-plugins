# solidjs/prefer-classlist (deprecated)

Prefers the `classList` prop over a classnames helper (`cn`, `clsx`, `classnames`) in `class`.

- **Version 1** (the default): unchanged from
  [eslint-plugin-solid 0.14.5](https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/prefer-classlist.md),
  where it is deprecated and off in `recommended`.
- **Version 2** (`settings.solidjs.version: 2`): **retired**, reports nothing. Solid 2.0 removes
  `classList` and merges it into `class`, which takes a string, an object or an array, and the
  compiler rejects `classList` on native elements (MIGRATION §classList → class (object/array forms);
  RFC 07 §Enhanced class prop). Use [`solidjs/no-classlist`](no-classlist.md), which rewrites
  `classList` into the `class` forms.
