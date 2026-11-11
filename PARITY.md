# Parity with upstream ESLint plugins

The oxlint ports follow these upstream versions (provenance and evidence in `vendor/*/README.md`):

| Port | Upstream | Upstream tests run against the port |
|---|---|---|
| `packages/query` | `@tanstack/eslint-plugin-query` 5.91.4 | yes: `bun run test:upstream` (part of `bun run test:unit`) runs the vendored suites unmodified against the ports in oxlint's `RuleTester` (ESLint-compat mode) |
| `packages/solidjs` | `eslint-plugin-solid` 0.14.5 | see TASK-024 |
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

## Solid

See TASK-024.
