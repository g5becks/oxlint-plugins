---
"oxlint-plugin-immutable": minor
---

`type-declaration-immutability` now checks union members, top-level arrays and tuples (`T[]`, `Array<T>`, `[A, B]`), mapped types without `readonly`, index signatures, `Map`/`Set`/`WeakMap`/`WeakSet`/`Record`, and `Partial`/`Required`/`Pick`/`Omit`/`NonNullable` over a literal (audit R7); previously only object literals, intersections and interfaces were checked. `{ readonly items: string[] }` is now accepted (ReadonlyShallow, as upstream). On a 22-declaration probe the rule now agrees with upstream eslint-plugin-functional 10.0.1 on 22 of 22 (was 13).

**This reports more declarations.** Migration: make them readonly (`readonly T[]`, `ReadonlyArray<T>`, `readonly [A, B]`, `ReadonlyMap`, `ReadonlySet`, `Readonly<Record<K, V>>`, `{ readonly [K in X]: T }`) or suppress with `// oxlint-disable-next-line immutable/type-declaration-immutability`. The README lists what the rule can't see without type information.
