# Oxlint Plugins - Quick PRD

Port 4 ESLint plugins (36 rules) to oxlint's alternative API (`createOnce`/`before()`) for ~15x performance improvement over ESLint. The four npm-publishable packages — `oxlint-plugin-router` (2 rules), `oxlint-plugin-query` (6 rules), `oxlint-plugin-functional` (8 rules), `oxlint-plugin-solid` (20 rules) — cover TanStack Router/Query integration, functional programming enforcement (including AST-only `ReadonlyShallow` immutability checking), and SolidJS best practices. All rules must support auto-fix where applicable and maintain dual compatibility with ESLint via `eslintCompatPlugin`.

Built as a Bun monorepo with TypeScript. Key technical constraints: no `@typescript-eslint/utils` dependency (use plain objects and string literals), no type checker access (AST-only analysis), inline all external utilities for the solid plugin, and use `Program` visitor instead of `before()` for per-file state resets. Runtime dependency is `@oxlint/plugins`; dev dependencies are `typescript`, `oxlint`, and `eslint` for dual-compat testing. Implementation follows 6 phases: scaffolding, then router (simplest, establishes patterns), functional (priority rules first), solid (simple JSX rules first, `reactivity` rule last), query (`exhaustive-deps` with scope analysis last), and integration testing.

Explicitly excluded: `no-void-query-fn` (needs type checker), `ReadonlyDeep`/`Immutable` enforcement levels (need type checker), type alias resolution in immutability rules, sonarjs plugin (deferred). Key risks: TypeScript AST node compatibility, scope manager edge cases, `@oxlint/plugins` API stability (technical preview), and the ~1000-line `reactivity` rule complexity.

---

*Generated with Clavix Planning Mode*
*Generated: 2026-02-13T00:00:00Z*
