# solidjs/prefer-for

Prefers Solid's list components over `Array#map` in JSX, which recreates DOM elements.

- **Version 1** (the default): unchanged from
  [eslint-plugin-solid 0.14.5](https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/prefer-for.md),
  which suggests `<For>` or `<Index>`.
- **Version 2** (`settings.solidjs.version: 2`): `<Index>` is gone, and `<Repeat>` handles
  count-based lists.

Sources: RFC 03 §List rendering, §Index → For keyed={false}, §Range/count rendering: Repeat;
MIGRATION §List rendering, §New in 2.0
([solidjs/solid@cd201ce](https://github.com/solidjs/solid/tree/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0)).

## Version 2

| Pattern in JSX | Report | Fix |
|---|---|---|
| `list.map((item) => ...)` | `preferFor` | autofix to `<For each={list}>{(item) => ...}</For>`, as in 1.x: default `For` passes the raw item |
| `list.map((item, i) => ...)` | `preferForV2`: neither form is a drop-in for `(item, i: number)`. `<For>` passes the index as an accessor (`i()`); `<For keyed={false}>` passes the item as an accessor and the index as a number | none |
| `Array.from({ length: n }, fn)`, `Array.from({ length: n }).map(fn)`, `[...Array(n)].map(fn)`, `Array(n).fill(x).map(fn)` (also `new Array`) | `preferRepeat`: `<Repeat>` renders by index without diffing, and its callback gets the index as a number | suggestion `<Repeat count={n}>{(i) => ...}</Repeat>` (adding `Repeat` to the `solid-js` import) when `fn` is an arrow whose item parameter is unused |
