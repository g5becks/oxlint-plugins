# Parity with upstream ESLint plugins

The oxlint ports follow these upstream versions (provenance and evidence in `vendor/*/README.md`):

| Port | Upstream | Upstream tests run against the port |
|---|---|---|
| `packages/query` | `@tanstack/eslint-plugin-query` 5.91.4 | yes: `bun run test:upstream` (part of `bun run test:unit`) runs the vendored suites unmodified against the ports in oxlint's `RuleTester` (ESLint-compat mode) |
| `packages/solidjs` | `eslint-plugin-solid` 0.14.5 | yes: `bun run test:upstream:solid` runs the vendored v0.14.5 suites (`vendor/eslint-plugin-solid@0.14.5/test`) unmodified against the ports, with `trackImports` mocked exactly as upstream's own `vitest.setup.js` does (so cases need no `solid-js` import) |
| `packages/router` | `@tanstack/eslint-plugin-router` (`create-route-property-order`) | no vendored suite; `route-param-names` is a custom rule with its own tests |

Every upstream case the ports intentionally don't match is listed below. Skipped cases are
registered in `tests/upstream/query/parity.ts`, whose skip reason links the section here.

## Query

### query-no-void-query-fn

**Whole suite skipped.** `no-void-query-fn` is not ported: it needs TypeScript type information
(it checks whether a `queryFn` returns `void`), which oxlint JS plugins don't have. The vendored
suite (`__tests__/no-void-query-fn.test.ts`) is excluded from the run and reported as one skipped
test.

### query-no-unstable-deps-react-module

Not skipped (no failing cases). Upstream 5.91.4 only tracks aliased React hooks imported from
`"React"` (capital R), a module name real code never uses; its own tests use `"React"`. The port
matches both `"react"` (the real module, an intentional fix also noted in the audit) and
`"React"`, so the upstream cases pass and real `import { useCallback as useCb } from "react"`
code is covered too.

### query-exhaustive-deps-report-node

Not skipped. The port reports `exhaustive-deps` on the `useQuery({ ... })` options object, like
upstream 5.107 and later (measured: line 3, column 22 to line 6, column 4 on the sample in
`packages/query/tests/exhaustive-deps-node.test.ts`). Upstream 5.91.4, the vendored version,
reported on the `queryKey` property; its test cases don't assert positions, so they pass either
way.

### query-stable-query-client-react-only

Not a divergence, a scope note: `stable-query-client` only checks `QueryClient` construction in
React components (`@tanstack/react-query`), as upstream does. It is a no-op for Solid, Vue and
other adapters.

### query-stable-query-client-no-react-import

4 upstream cases skipped (`stable-query-client`: "QueryClient is not stable when it is not wrapped
in React.useState in component", "... in custom hook", "preserve QueryClient options", "preserve
QueryClient variable declarator name"). In a file that imports neither `useState` nor a React
namespace from `react`, upstream autofixes to `React.useState(() => new QueryClient())`, which
references an undefined `React` unless one is global, so `oxlint --fix` would produce code that
doesn't type-check (found by the fix-safety suite, TASK-026). The port reports the same problem and
offers that rewrite as a suggestion; with `import { useState }` (also aliased) or a `React` /
`* as R` import it autofixes using the local name, as upstream does.

## Solid

All 465 runnable upstream cases pass except the 3 listed under
[solid-components-return-once-imports](#solid-components-return-once-imports) (462 pass). Fixed in the port while bringing the suites up (TASK-024):
`imports` crashed on `import "solid-js"` / `import {} from "solid-js"` when fixing (now uses
upstream's `appendImports`); static values are now evaluated like upstream's `getStaticValue`
(string concatenation, unary minus, `const` resolution), which fixes `jsx-no-script-url` on
`"javascrip" + "t:..."`, `no-innerhtml` on concatenated static HTML, and `style-prop` on
`'margin-top': -10`; `style-prop`'s string-style fix drops declarations without a value, like
`style-to-object`.

### solid-jsx-uses-vars-suite

**Whole suite skipped.** Upstream's `jsx-uses-vars` test drives ESLint 8 internals (it registers
the rule next to ESLint's own `no-unused-vars` through `eslint-v8`), which oxlint's `RuleTester`
can't do. Under oxlint the rule has no effect: oxlint's `no-unused-vars` is native and doesn't see
a JS plugin's `markVariableAsUsed` (verified on oxlint 1.70.0 and 1.93.0; pinned by a CLI test).
It still works in ESLint, so the `recommended` preset (an ESLint preset) keeps it, as upstream does.

### solid-style-prop-vendor-prefixes

Not skipped. Upstream validates vendor-prefixed properties against `known-css-properties`' full
list; the port (which doesn't bundle that list) accepts any lowercase kebab-case name starting with
`-webkit-`, `-moz-`, `-ms-` or `-o-`, and suggests the kebab form for camelCase ones
(`-webkitAlignContent`). Slightly more permissive than upstream for misspelled vendor names.

### solid-reactivity-0145-vs-0190

Not skipped. The audit compared the port with eslint-plugin-solid 0.19.0 and found two
`reactivity` differences; both are upstream changes between 0.14.5 (which the port follows) and
0.19.0, not port bugs. Measured 2026-11-11 on minimal reproductions
(`packages/solidjs/tests/reactivity-parity.test.ts`) and on the original files:

| Case | 0.14.5 | port | 0.19.0 |
|---|---|---|---|
| `const [a, setA] = makePersisted(createSignal(""), ...)` (agentx `auth-store.tsx:34`) | reported (`shouldDestructure`) | reported | not reported |
| a value read from a signal inside a `useQuery(() => ...)` factory and used in `queryFn` (agentx `WatchlistSheet.tsx:604`) | not reported | not reported | reported |

Moving the port to 0.19.0 behavior would mean porting 0.15–0.19's reactivity changes (1,600+ lines
of upstream diff); not done here.

### solid-components-return-once-imports

3 upstream cases skipped (`components-return-once` invalid cases 5, 6 and 7, matched by their
code). Upstream's fixes rewrite early returns to `<Show>`, `<Switch>` and `<Match>` without
importing them, so the fixed file references undefined components. The port's fixes also add the
missing names to the `solid-js` import (or a new one), so the expected `output` differs only by
that import line. Found by the fix-safety suite (TASK-026).
