# Product Requirements Document: Oxlint Plugins

## Problem & Goal

ESLint is too slow in the user's codebase. Biome's GritQL plugin system was explored but is too limited (no auto-fix, no type awareness, diagnostic-only). Oxlint's JS plugin system provides an ESLint-compatible API with ~15x performance improvement, auto-fix support, and scope analysis.

**Goal:** Port 4 ESLint plugins (36 rules total) to oxlint's alternative API (`createOnce`/`before()`) as a Bun monorepo with 4 separate npm-publishable packages and extensive tests.

## Requirements

### Must-Have Features

1. **4 npm-publishable packages** — `oxlint-plugin-router` (2 rules), `oxlint-plugin-query` (6 rules), `oxlint-plugin-functional` (8 rules), `oxlint-plugin-solid` (20 rules)
2. **Oxlint alternative API** — All rules use `createOnce`/`before()` pattern for maximum performance; per-file state reset via `Program` visitor (not `before()` due to future compatibility caveat)
3. **Auto-fix support** — Property ordering rules, `prefer-property-signatures`, `components-return-once`, `no-destructure`, `prefer-show`, `prefer-for`, `prefer-classlist`, `self-closing-comp`
4. **AST-only immutability checking** — `prefer-immutable-types` and `type-declaration-immutability` implement `ReadonlyShallow` mode only (no type checker dependency)
5. **Scope analysis** — `exhaustive-deps` (query) and `jsx-no-undef` (solid) use `context.sourceCode.getScope()`/`scopeManager`
6. **Dual ESLint compatibility** — Plugins also work with ESLint via `eslintCompatPlugin` wrapper from `@oxlint/plugins`
7. **Comprehensive tests** — `bun test` with `RuleTester` or CLI-based integration tests; port key test cases from original suites

### Technical Requirements

- **Runtime:** Bun monorepo with bun workspaces
- **Language:** TypeScript
- **Runtime dependency:** `@oxlint/plugins` (provides `eslintCompatPlugin`)
- **Dev dependencies:** `typescript`, `@types/bun`, `oxlint`, `eslint` (for dual-compat testing)
- **No external deps for solid plugin** — `is-html`, `kebab-case`, `known-css-properties`, `style-to-object` all inlined
- **No `@typescript-eslint/utils`** — Replace `RuleCreator` with plain objects, `TSESTree` with standard ESTree, `AST_NODE_TYPES` enum with string literals

### Architecture & Design

- **`createOnce` pattern:** Single rule instance created once, `before()`/`Program` resets per-file state
- **Import detection inlined:** Remove HOF wrappers (`detectTanstackRouterImports`, `detectTanstackQueryImports`), inline into closure + visitors
- **Solid compat layer removed:** No `compat.ts`, use `context.sourceCode` directly
- **Shared utilities per-package:** `sortDataByOrder` for property ordering, `trace()` for solid variable resolution, `immutability.ts` for shallow checks
- **Monorepo structure:** `packages/{plugin-router,plugin-query,plugin-functional,plugin-solid}/` each with `src/`, `tests/`, `package.json`

## Implementation Phases

1. **Phase 1:** Monorepo scaffolding (root config, workspaces, shared tsconfig)
2. **Phase 2:** Router plugin (2 rules — establishes patterns)
3. **Phase 3:** Functional plugin (8 rules — priority rules first: `no-let`, `no-throw-statements`, `prefer-property-signatures`, `prefer-immutable-types`, `type-declaration-immutability`)
4. **Phase 4:** Solid plugin (20 rules — simple JSX rules first, `reactivity` last)
5. **Phase 5:** Query plugin (6 rules — `exhaustive-deps` last due to scope analysis complexity)
6. **Phase 6:** Integration testing & polish (CLI tests, dual compat, npm publishing setup)

## Risk Areas

1. **TypeScript AST nodes** — Rules using `TSTypeLiteral`, `TSPropertySignature` need oxlint parser verification
2. **Scope manager compatibility** — `exhaustive-deps` relies on `scopeManager`; edge cases may differ
3. **`@oxlint/plugins` stability** — Package availability and API stability (JS plugins are technical preview)
4. **`before()` not guaranteed** — Use `Program` visitor for critical per-file state resets
5. **Solid `reactivity` rule** — ~1000+ lines, scope stack tracking, many edge cases; port incrementally
6. **JSX AST compatibility** — Standard JSX nodes should work but need early verification

## Out of Scope

- **`no-void-query-fn` rule** — Requires TypeScript type checker (`parserServices.program.getTypeChecker()`), not available in oxlint JS plugins
- **`ReadonlyDeep` and `Immutable` enforcement levels** — Require type checker for deep type resolution
- **Type alias resolution** in `type-declaration-immutability` — Only works for inline type definitions
- **Sonarjs plugin** — Deferred to later
- **Mobile/web UI** — These are npm packages, no frontend
- **CI/CD pipeline** — Out of initial scope

## Success Criteria

1. `bun test` passes for all 4 packages
2. `oxlint --config .oxlintrc.json` runs plugins against fixture files successfully
3. Each rule produces correct diagnostics on known-bad code and passes on known-good code
4. Auto-fix rules produce correct output
5. Plugins also load in ESLint (dual compatibility verified)
6. All 36 rules ported and tested

---

*Generated with Clavix Planning Mode*
*Generated: 2026-02-13T00:00:00Z*
