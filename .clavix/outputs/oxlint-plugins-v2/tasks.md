# Implementation Plan

**Project**: oxlint-plugins-v2
**Generated**: 2026-02-13

## Technical Context & Standards
*Detected Stack & Patterns*
- **Architecture**: Bun monorepo, 4 packages under `packages/`
- **Correct pattern** (see Router/Functional): `createOnce(context)` + `Program` visitor for state reset + plain objects (no `ESLintUtils.RuleCreator`) + string literals (no `AST_NODE_TYPES`)
- **Incorrect pattern** (Query/Solid currently): `asOxlintRule()` wrapper delegating to upstream ESLint `create()` rules
- **Testing**: `bun test` with `RuleTester` from `eslint`

**Reference implementations** (correctly ported):
- `packages/plugin-router/src/rules/route-param-names.ts` — createOnce with inlined import detection
- `packages/plugin-functional/src/rules/no-let.ts` — simplest createOnce rule

**Upstream sources** (read but don't import):
- Query: `packages/plugin-query/src/upstream/rules/`
- Solid: `packages/plugin-solid/src/upstream/rules/`

---

## Phase 1: Cleanup & Infrastructure Fixes

- [x] **Fix test runner to exclude upstream tests** (ref: Critical Fix #5)
  Task ID: phase-1-infra-01
  > **Implementation**: Create `bunfig.toml` at project root OR update `package.json` test scripts.
  > **Details**: Upstream tests in `packages/*/src/upstream/__tests__/` and `query/packages/` fail because `@typescript-eslint/rule-tester` isn't installed. Exclude these paths. Ensure `bun test` only runs `packages/*/tests/*.test.ts` and `tests/**/*.test.ts`. Verify: `bun test` should show 58 pass, 0 fail.

- [x] **Remove `@typescript-eslint/utils` from router package.json** (ref: Critical Fix #4)
  Task ID: phase-1-infra-02
  > **Implementation**: Edit `packages/plugin-router/package.json`.
  > **Details**: Remove `"@typescript-eslint/utils": "^8.48.0"` from `dependencies`. Router's ported rules don't import it. Run `bun install` to update lockfile. Verify router tests still pass.

---

## Phase 2: Query Plugin — Port 6 Rules to createOnce

- [x] **Verify query utility files are correct** (ref: Technical Approach)
  Task ID: phase-2-query-01
  > **Implementation**: Read `packages/plugin-query/src/utils/constants.ts`, `ast-utils.ts`, `detect-query-imports.ts`, `sort-data-by-order.ts`, `create-property-order-rule.ts`.
  > **Details**: These were created during initial implementation but are unused (rules delegate to upstream). Verify they don't import from `@typescript-eslint/utils` or upstream. If they do, fix them. They should use plain types and string literals. The `create-property-order-rule.ts` factory should return a `createOnce`-compatible object.

- [x] **Port no-rest-destructuring to createOnce** (ref: Query Port Order)
  Task ID: phase-2-query-02
  > **Implementation**: Rewrite `packages/plugin-query/src/rules/no-rest-destructuring.ts`.
  > **Details**: Currently: `import { rule } from "../upstream/..."; export default asOxlintRule(rule);`. Rewrite as a `createOnce` rule. Read upstream source at `src/upstream/rules/no-rest-destructuring/` to understand logic. Visit `VariableDeclarator` with `ObjectPattern` containing `RestElement` where init is a TanStack Query hook call. Track imports per-file in closure, reset in `Program`. Use `detect-query-imports.ts` utility. No `@typescript-eslint/utils` imports.

- [x] **Port stable-query-client to createOnce** (ref: Query Port Order)
  Task ID: phase-2-query-03
  > **Implementation**: Rewrite `packages/plugin-query/src/rules/stable-query-client.ts`.
  > **Details**: Visit `NewExpression` for `QueryClient` constructor. Check if inside component/function body (not module scope) via `node.parent` chain. Reset state in `Program`.

- [x] **Port infinite-query-property-order to createOnce** (ref: Query Port Order)
  Task ID: phase-2-query-04
  > **Implementation**: Rewrite `packages/plugin-query/src/rules/infinite-query-property-order.ts`.
  > **Details**: Use `create-property-order-rule.ts` factory from `src/utils/`. Pass infinite query hook names and property order config. Factory should return `createOnce`-compatible rule.

- [x] **Port mutation-property-order to createOnce** (ref: Query Port Order)
  Task ID: phase-2-query-05
  > **Implementation**: Rewrite `packages/plugin-query/src/rules/mutation-property-order.ts`.
  > **Details**: Same factory as infinite-query-property-order, different hook names and order config.

- [x] **Port no-unstable-deps to createOnce** (ref: Query Port Order)
  Task ID: phase-2-query-06
  > **Implementation**: Rewrite `packages/plugin-query/src/rules/no-unstable-deps.ts`.
  > **Details**: Visit `CallExpression` for query hooks. Track multiple state maps (query keys, deps). Detect unstable references. Reset all maps in `Program`.

- [x] **Port exhaustive-deps to createOnce** (ref: Query Port Order)
  Task ID: phase-2-query-07
  > **Implementation**: Rewrite `packages/plugin-query/src/rules/exhaustive-deps.ts`.
  > **Details**: Most complex query rule. Uses `context.sourceCode.scopeManager` for scope analysis. Port `getExternalRefs()` and `isRelevantReference()` as local helpers or into `ast-utils.ts`. Detect variables referenced inside query functions not in query key. Reset state in `Program`. Test scope analysis thoroughly.

- [x] **Remove asOxlintRule.ts from query package** (ref: Cleanup)
  Task ID: phase-2-query-08
  > **Implementation**: Delete `packages/plugin-query/src/utils/as-oxlint-rule.ts`.
  > **Details**: No ported rule should import this anymore. Grep to confirm zero references.

- [x] **Remove `@typescript-eslint/utils` from query package.json** (ref: Critical Fix #4)
  Task ID: phase-2-query-09
  > **Implementation**: Edit `packages/plugin-query/package.json`.
  > **Details**: Remove `"@typescript-eslint/utils": "^8.48.0"` from `dependencies`. Run `bun install`. Verify all query tests pass.

- [x] **Verify query tests pass** (ref: Success Criteria)
  Task ID: phase-2-query-10
  > **Implementation**: Run `bun test packages/plugin-query/tests/`.
  > **Details**: All 6 existing test files should pass. If any tests fail due to behavioral changes in the port, fix the rule or update the test. Add additional test cases if coverage is thin.

---

## Phase 3: Solid Plugin — Port Batch 1 (Simple JSX, 8 rules)

- [x] **Verify solid utility files are correct** (ref: Technical Approach)
  Task ID: phase-3-solid-01
  > **Implementation**: Read `packages/plugin-solid/src/utils/jsx.ts`, `imports.ts`, `trace.ts`, `traverse.ts`.
  > **Details**: Verify they don't import from `@typescript-eslint/utils`, `estraverse`, `is-html`, or any external dep. `jsx.ts` should have inlined HTML tag names Set and JSX helpers. `traverse.ts` should use `node.parent` chains, not `estraverse`. Fix if needed.

- [x] **Port jsx-no-duplicate-props to createOnce** (ref: Solid Batch 1)
  Task ID: phase-3-solid-02
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/jsx-no-duplicate-props.ts`.
  > **Details**: Currently imports from upstream. Read upstream source at `src/upstream/rules/jsx-no-duplicate-props.ts`. Rewrite as `createOnce`: visit `JSXOpeningElement`, collect attribute names in a Set, report duplicates. No per-file state needed (Set is per-node). Plain object export.

- [x] **Port jsx-no-script-url to createOnce** (ref: Solid Batch 1)
  Task ID: phase-3-solid-03
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/jsx-no-script-url.ts`.
  > **Details**: Visit `JSXAttribute` with `javascript:` URL values.

- [x] **Port jsx-uses-vars to createOnce** (ref: Solid Batch 1)
  Task ID: phase-3-solid-04
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/jsx-uses-vars.ts`.
  > **Details**: Visit `JSXOpeningElement`, mark variables as used via `context.markVariableAsUsed()`.

- [x] **Port no-innerhtml to createOnce** (ref: Solid Batch 1)
  Task ID: phase-3-solid-05
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/no-innerhtml.ts`.
  > **Details**: Detect `innerHTML`/`outerHTML` in JSX attributes and member expressions.

- [x] **Port self-closing-comp to createOnce** (ref: Solid Batch 1)
  Task ID: phase-3-solid-06
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/self-closing-comp.ts`.
  > **Details**: Visit `JSXElement` with no children. Auto-fix to `<Comp />`. Support `html`/`component` options. Use `jsx.ts` utility for `isDOMElementName()`.

- [x] **Port no-react-specific-props to createOnce** (ref: Solid Batch 1)
  Task ID: phase-3-solid-07
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/no-react-specific-props.ts`.
  > **Details**: Flag `className`→`class`, `htmlFor`→`for`, etc. Auto-fix.

- [x] **Port no-unknown-namespaces to createOnce** (ref: Solid Batch 1)
  Task ID: phase-3-solid-08
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/no-unknown-namespaces.ts`.
  > **Details**: Validate JSX namespace prefixes against known Solid namespaces (`on`, `oncapture`, `use`, `prop`, `attr`).

- [x] **Port no-proxy-apis to createOnce** (ref: Solid Batch 1)
  Task ID: phase-3-solid-09
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/no-proxy-apis.ts`.
  > **Details**: Flag proxy-incompatible APIs on reactive objects.

---

## Phase 4: Solid Plugin — Port Batches 2-3 (Import/Naming + Preference, 6 rules)

- [x] **Port imports rule to createOnce** (ref: Solid Batch 2)
  Task ID: phase-4-solid-01
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/imports.ts`.
  > **Details**: Enforce correct solid-js import sources. Map APIs to `solid-js`, `solid-js/web`, `solid-js/store`. Auto-fix. Use `imports.ts` utility.

- [x] **Port event-handlers to createOnce** (ref: Solid Batch 2)
  Task ID: phase-4-solid-02
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/event-handlers.ts`.
  > **Details**: Validate event handler naming. Include 74+ DOM event names as const Set. Check `on:*`/`oncapture:*` namespaces.

- [x] **Port no-react-deps to createOnce** (ref: Solid Batch 2)
  Task ID: phase-4-solid-03
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/no-react-deps.ts`.
  > **Details**: Flag React-style dependency arrays in Solid reactive primitives.

- [x] **Port prefer-show to createOnce** (ref: Solid Batch 3)
  Task ID: phase-4-solid-04
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/prefer-show.ts`.
  > **Details**: Convert JSX ternaries to `<Show>`. Auto-fix. Handle nested ternaries and `&&` patterns.

- [x] **Port prefer-for to createOnce** (ref: Solid Batch 3)
  Task ID: phase-4-solid-05
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/prefer-for.ts`.
  > **Details**: Convert `.map()` in JSX to `<For>`. Auto-fix.

- [x] **Port prefer-classlist to createOnce** (ref: Solid Batch 3)
  Task ID: phase-4-solid-06
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/prefer-classlist.ts`.
  > **Details**: Convert ternary `class` to `classList`. Auto-fix.

---

## Phase 5: Solid Plugin — Port Batches 4-5 (Medium + Complex, 6 rules)

- [x] **Port style-prop to createOnce** (ref: Solid Batch 4)
  Task ID: phase-5-solid-01
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/style-prop.ts`.
  > **Details**: Inline `style-to-object` parser (~30 lines) and `known-css-properties` Set (~350 names) directly in the rule file or in `jsx.ts` utility. Validate style prop format and property names.

- [x] **Port jsx-no-undef to createOnce** (ref: Solid Batch 4)
  Task ID: phase-5-solid-02
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/jsx-no-undef.ts`.
  > **Details**: Use `context.sourceCode.getScope()` for variable resolution. Handle Solid control flow component auto-import suggestions. Use scope analysis directly — no compat layer.

- [x] **Port no-array-handlers to createOnce** (ref: Solid Batch 4)
  Task ID: phase-5-solid-03
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/no-array-handlers.ts`.
  > **Details**: Detect array index in event handlers inside `.map()`/`<For>`.

- [x] **Port no-destructure to createOnce** (ref: Solid Batch 5)
  Task ID: phase-5-solid-04
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/no-destructure.ts`.
  > **Details**: Track function scope stack in `createOnce` closure. Detect props destructuring. Auto-fix with `mergeProps()`/`splitProps()`. Multiple fix strategies. Reset scope stack in `Program`.

- [x] **Port components-return-once to createOnce** (ref: Solid Batch 5)
  Task ID: phase-5-solid-05
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/components-return-once.ts`.
  > **Details**: Track function scopes, detect multiple JSX return paths. Auto-fix with `<Show>`/`<Switch>`. Reset in `Program`.

- [x] **Port reactivity to createOnce** (ref: Solid Batch 5)
  Task ID: phase-5-solid-06
  > **Implementation**: Rewrite `packages/plugin-solid/src/rules/reactivity.ts`.
  > **Details**: Most complex rule (~1000+ lines). Maintain scope stack for reactive contexts. Track signal/memo/props/derived values. Use `trace.ts` utility for variable resolution and `traverse.ts` for tree walking. Port incrementally: (1) core signal detection + scope tracking, (2) edge cases. All state reset in `Program`. No `estraverse`, no `ESLintUtils`, no `TSESTree`. Test thoroughly.

---

## Phase 6: Solid Cleanup & Final Verification

- [x] **Add eslintCompatPlugin wrapper to solid index** (ref: Critical Fix #3)
  Task ID: phase-6-final-01
  > **Implementation**: Edit `packages/plugin-solid/src/index.ts`.
  > **Details**: Currently exports a plain object. Wrap with `eslintCompatPlugin()` like the other 3 plugins. Import from `@oxlint/plugins`.

- [x] **Remove asOxlintRule.ts from solid package** (ref: Cleanup)
  Task ID: phase-6-final-02
  > **Implementation**: Delete `packages/plugin-solid/src/utils/as-oxlint-rule.ts`.
  > **Details**: Grep to confirm zero references in ported code.

- [x] **Remove external deps from solid package.json** (ref: Critical Fix #4)
  Task ID: phase-6-final-03
  > **Implementation**: Edit `packages/plugin-solid/package.json`.
  > **Details**: Remove from `dependencies`: `@typescript-eslint/utils`, `estraverse`, `is-html`, `kebab-case`, `known-css-properties`, `style-to-object`. Only `@oxlint/plugins` should remain. Run `bun install`.

- [x] **Run full verification suite** (ref: Success Criteria)
  Task ID: phase-6-final-04
  > **Implementation**: Run verification commands from Success Criteria.
  > **Details**: (1) `grep -r "asOxlintRule" packages/` = 0 matches. (2) `grep -r "@typescript-eslint/utils" packages/*/src/` excluding `upstream/` = 0 matches. (3) `grep -r "from.*upstream" packages/*/src/rules/` = 0 matches. (4) All 4 index files use `eslintCompatPlugin()`. (5) All rules use `createOnce`. (6) `bun test` = all pass, 0 fail. (7) No external deps in any package.json `dependencies` except `@oxlint/plugins`.

- [x] **Deepen integration tests** (ref: Improvement #6)
  Task ID: phase-6-final-05
  > **Implementation**: Edit `tests/integration/plugins.integration.test.ts`.
  > **Details**: Add `RuleTester` tests that run actual linting on fixture code. At minimum: one rule per plugin with valid + invalid cases. Verify diagnostics are produced.

- [x] **Deepen ESLint compat tests** (ref: Improvement #7)
  Task ID: phase-6-final-06
  > **Implementation**: Edit `tests/eslint-compat/eslint-compat.test.ts`.
  > **Details**: Add `RuleTester` execution through ESLint for at least one rule per plugin. Import `RuleTester` from `eslint`, configure parser, run valid/invalid test case.

---

*Generated by Clavix /clavix:plan*
