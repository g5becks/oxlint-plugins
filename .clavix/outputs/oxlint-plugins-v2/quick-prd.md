# Oxlint Plugins v2 — Quick PRD

The initial port left 26 of 36 rules (Query: 6, Solid: 20) as thin `asOxlintRule()` wrappers around the original ESLint `create()` code instead of proper `createOnce` ports. These rules still depend on `@typescript-eslint/utils`, `estraverse`, and other external packages. Router (2 rules) and Functional (8 rules) were correctly ported. The goal is to complete the remaining 26 rules: rewrite each from `create()` to `createOnce()`, inline all external deps, reset per-file state in `Program` visitors, use string literals instead of `AST_NODE_TYPES`, and remove the `asOxlintRule` shim entirely.

Query rules port in order: `no-rest-destructuring`, `stable-query-client`, `infinite-query-property-order`, `mutation-property-order`, `no-unstable-deps`, `exhaustive-deps` (scope analysis last). Solid rules port in 5 batches: simple JSX (8), import/naming (3), JSX preference with auto-fix (3), medium complexity (3), complex rules (3 — `reactivity` last at ~1000+ lines). Each rule reads the upstream source, understands the logic, and rewrites as `createOnce`. Existing utility files in `src/utils/` are already created but need to be wired into the new rules. Solid plugin must also add `eslintCompatPlugin` wrapper and inline `is-html`, `kebab-case`, `known-css-properties`, `style-to-object`, and `estraverse`.

Explicitly excluded: re-porting Router/Functional (already correct), `no-void-query-fn` (needs type checker), `ReadonlyDeep`/`Immutable` enforcement, sonarjs plugin. Success: zero `asOxlintRule` references, zero `@typescript-eslint/utils` imports in ported code, all rules use `createOnce`, all tests pass, no external deps in package.json except `@oxlint/plugins`.

---

*Generated with Clavix Planning Mode*
*Generated: 2026-02-13*
