---
"oxlint-plugin-solidjs": minor
---

`reactivity` follows Solid 2.0's tracking model at `settings.solidjs.version: 2`:
- split effects: compute tracked, apply untracked, with a new `readInApply` report;
- async computations, with a new `readAfterAwait` report for reads after the first `await`;
- `onSettled`, `onFlush` and `action` bodies, ref callbacks and ref arrays;
- camelCase-only event handlers;
- `For` keyed modes, `Repeat`, and `Show`/`Match` accessor children;
- reads in control-flow callback bodies;
- `isPending`/`latest` evaluated where they're called;
- the new primitives `createOptimistic`, `createProjection`, `merge` and `omit`.

Version 1 is unchanged. The rule's documentation is `packages/solidjs/docs/rules/reactivity.md`.
