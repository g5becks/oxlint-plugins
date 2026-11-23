# solidjs/no-cleanup-in-ref

Disallows `onCleanup`, `getOwner` and owned primitives inside ref callbacks, which Solid 2.0 runs
without an owner.

**Version 2 only:** the rule reports nothing unless `settings.solidjs.version` is `2`.

Sources: MIGRATION §Ref callbacks: no longer owned; RFC 07 §Two-phase directive factories (owned
setup, unowned application); RFC 08 §CLEANUP_IN_FORBIDDEN_SCOPE, §NO_OWNER_EFFECT
([solidjs/solid@cd201ce](https://github.com/solidjs/solid/tree/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0)).

In 1.x a ref callback ran inside the component's owner, so cleanup could be registered inline. In
2.0 `getOwner()` is `null` there.

| In a ref callback | Report | Why |
|---|---|---|
| `onCleanup(...)` | `cleanupInRef` | throws `CLEANUP_IN_FORBIDDEN_SCOPE` |
| `getOwner()` | `getOwnerInRef` | returns `null` |
| `createSignal`, `createMemo`, `createEffect`, `createStore`, …, `onSettled` | `primitiveInRef` | no owner: never disposed (RFC 07: "No new primitives should be created in this callback") |

Checked: inline functions passed to `ref={...}` on any element, including inside (nested)
`ref={[...]}` arrays, and their callbacks that run in place. Functions that run later (event
handlers set up inside) don't count. A directive factory's returned callback isn't followed. The
factory's own body is owned, and is the right place for this work.

Fix: move lifecycle work to `onSettled` in the component body (the ref is assigned by then and its
returned cleanup runs on disposal), or to a directive factory's setup half. MIGRATION shows both.
There is no autofix.
