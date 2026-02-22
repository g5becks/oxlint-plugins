# Product Requirements Document: Oxlint Plugins v2 — Complete the Port

## Problem & Goal

The initial implementation ported Router (2 rules) and Functional (8 rules) correctly to oxlint's `createOnce` alternative API. However, Query (6 rules) and Solid (20 rules) were implemented as thin `asOxlintRule()` wrappers around the original ESLint `create()` code. This means 26 of 36 rules (72%) are NOT using the oxlint alternative API and still depend on `@typescript-eslint/utils`, `estraverse`, and other external packages that the spec requires to be removed/inlined.

**Goal:** Complete the port of all 26 remaining rules to the oxlint `createOnce` pattern, remove all external dependencies from ported code, and fix architectural violations identified in the verification audit.

## Current State (What's Done Right)

- Monorepo scaffolding: complete and correct
- Router plugin (2 rules): fully ported to `createOnce`, no external deps
- Functional plugin (8 rules): fully ported to `createOnce`, no external deps
- All 58 ported tests pass
- Integration tests and eslint-compat tests exist (but are shallow)
- `.oxlintrc.json` dogfooding config exists
- Package.json exports for npm publishing are set up

## Requirements

### Critical Fixes (from verification audit)

1. **Port all 6 Query rules to `createOnce`** — Replace `asOxlintRule()` wrappers with proper `createOnce` implementations. Remove dependency on upstream ESLint code. Each rule must:
   - Use `createOnce(context)` instead of `create(context)`
   - Reset per-file state in `Program` visitor
   - Use string literals instead of `AST_NODE_TYPES` enum
   - Not import from `@typescript-eslint/utils`
   - Inline import detection (no HOF wrapper)

2. **Port all 20 Solid rules to `createOnce`** — Same requirements as Query. Additionally:
   - Remove `asOxlintRule.ts` utility entirely
   - Inline all external deps: `is-html` (HTML tag Set), `kebab-case` (regex), `known-css-properties` (const Set), `style-to-object` (inline parser), `estraverse` (manual `node.parent` walking)
   - Remove ESLint compat layer (`compat.ts`) — use `context.sourceCode` directly
   - Port `trace()` utility to use `context.sourceCode.getScope()` without compat layer

3. **Add `eslintCompatPlugin` wrapper to Solid plugin** — `packages/plugin-solid/src/index.ts` must use `eslintCompatPlugin()` like Router, Query, and Functional do.

4. **Remove `@typescript-eslint/utils` from all package.json deps** — Router and Query list it as a runtime dependency but ported rules don't use it. Solid lists it plus 5 other external deps. All must be removed from ported packages' `dependencies`.

5. **Fix test runner to exclude upstream files** — `bun test` at root picks up 63 failing upstream tests. Add a `bunfig.toml` or adjust test scripts to only run `packages/*/tests/` and `tests/`.

### Improvements (from verification audit)

6. **Deepen integration tests** — Current tests only check that rule keys exist. Should run actual linting via `RuleTester` against fixture code to verify diagnostics.

7. **Deepen ESLint compat tests** — Current tests only check `create` function existence. Should execute at least one `RuleTester` run through ESLint per plugin.

## Technical Approach

### Query Plugin Port (6 rules)

Port order (simplest to most complex):
1. `no-rest-destructuring` — VariableDeclarator visitor, import tracking
2. `stable-query-client` — NewExpression + ancestor detection
3. `infinite-query-property-order` — Use existing `create-property-order-rule.ts` factory adapted for `createOnce`
4. `mutation-property-order` — Same factory
5. `no-unstable-deps` — Multiple state maps, CallExpression visitor
6. `exhaustive-deps` — Scope analysis via `context.sourceCode.scopeManager` (most complex)

Each rule: read the upstream source in `src/upstream/rules/`, understand the logic, rewrite as `createOnce` with inlined import detection. Use the existing `src/utils/` files (constants, ast-utils, detect-query-imports, sort-data-by-order, create-property-order-rule) which were already created but are unused because rules delegate to upstream.

### Solid Plugin Port (20 rules)

Port order (5 batches, simplest to most complex):

**Batch 1 — Simple JSX rules (8):** `jsx-no-duplicate-props`, `jsx-no-script-url`, `jsx-uses-vars`, `no-innerhtml`, `self-closing-comp`, `no-react-specific-props`, `no-unknown-namespaces`, `no-proxy-apis`

**Batch 2 — Import/naming rules (3):** `imports`, `event-handlers`, `no-react-deps`

**Batch 3 — JSX preference rules with auto-fix (3):** `prefer-show`, `prefer-for`, `prefer-classlist`

**Batch 4 — Medium complexity (3):** `style-prop` (inline CSS parser + properties Set), `jsx-no-undef` (scope analysis), `no-array-handlers`

**Batch 5 — Complex rules (3):** `no-destructure` (multiple fix strategies), `components-return-once` (scope tracking + auto-fix), `reactivity` (~1000+ lines, port last)

Each rule: read the upstream source in `src/upstream/rules/`, understand the ESLint `create()` logic, rewrite as `createOnce` with:
- No `ESLintUtils.RuleCreator` — use plain objects
- No `TSESTree` types — use `any` or inline types
- No `AST_NODE_TYPES` enum — use string literals
- No `estraverse` — use `node.parent` chains
- Per-file state reset in `Program` visitor

### Utility Files

The existing `src/utils/` files in both packages were already created during the initial implementation but aren't wired up. Verify they're correct and wire them into the new `createOnce` rules:
- **Query:** `constants.ts`, `ast-utils.ts`, `detect-query-imports.ts`, `sort-data-by-order.ts`, `create-property-order-rule.ts`
- **Solid:** `jsx.ts`, `imports.ts`, `trace.ts`, `traverse.ts`

### Cleanup

After porting is complete:
- Delete `asOxlintRule.ts` from both packages
- The `upstream/` directories can remain as reference but should NOT be imported by any ported code
- Remove all external deps from `packages/plugin-solid/package.json` and `packages/plugin-query/package.json`
- Remove `@typescript-eslint/utils` from `packages/plugin-router/package.json` (ported rules don't use it)

## Out of Scope

- Re-porting Router or Functional plugins (already correct)
- Adding new rules beyond the 36 already planned
- `no-void-query-fn` (still excluded — needs type checker)
- `ReadonlyDeep`/`Immutable` enforcement (still excluded)
- Sonarjs plugin (still deferred)
- The `upstream/` reference directories — leave them in place, just don't import from them

## Success Criteria

1. `grep -r "asOxlintRule" packages/` returns zero matches (all wrappers removed)
2. `grep -r "@typescript-eslint/utils" packages/*/src/` returns zero matches (excluding `upstream/`)
3. `grep -r "from.*upstream" packages/*/src/rules/` returns zero matches
4. All 4 plugin index files use `eslintCompatPlugin()` wrapper
5. All rules use `createOnce` (not `create`)
6. `bun test` passes with zero failures (upstream tests excluded)
7. No external deps in any package.json `dependencies` except `@oxlint/plugins`

---

*Generated with Clavix Planning Mode*
*Generated: 2026-02-13*
