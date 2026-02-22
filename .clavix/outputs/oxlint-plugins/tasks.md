# Implementation Plan

**Project**: oxlint-plugins
**Generated**: 2026-02-13

## Technical Context & Standards
*Detected Stack & Patterns*
- **Architecture**: Bun monorepo with 4 npm-publishable packages
- **Framework**: Oxlint JS plugin API (`createOnce`/`before()`) + ESLint compat via `eslintCompatPlugin`
- **Language**: TypeScript (strict, ESNext, bundler module resolution)
- **Testing**: `bun test` with `RuleTester` from `eslint`
- **Conventions**: Per-file state reset via `Program` visitor; no `@typescript-eslint/utils`; string literals instead of `AST_NODE_TYPES` enum; inline all external utils for solid plugin

**Source references** (original ESLint plugins to port from):
- Router: `router/packages/eslint-plugin-router/src/`
- Query: `query/packages/eslint-plugin-query/src/`
- Functional: `eslint-plugin-functional/src/`
- Solid: `eslint-plugin-solid/packages/eslint-plugin-solid/src/`
- Oxlint API docs: `oxlint/src/docs/guide/usage/linter/js-plugins.md`

---

## Phase 1: Monorepo Scaffolding

- [x] **Create root workspace configuration** (ref: Architecture & Design)
  Task ID: phase-1-scaffold-01
  > **Implementation**: Edit `package.json` at project root.
  > **Details**: Add `"workspaces": ["packages/*"]` to existing root `package.json`. Add `@oxlint/plugins` as a dependency. Keep existing `@types/bun` and `typescript` deps. Set `"private": true`.

- [x] **Create shared tsconfig for packages** (ref: Technical Requirements)
  Task ID: phase-1-scaffold-02
  > **Implementation**: Edit `tsconfig.json` at project root.
  > **Details**: Add `"references"` array pointing to each package's tsconfig. Existing compilerOptions are already correct (ESNext, bundler, strict). Add `"paths"` if needed for cross-package imports (unlikely — packages are independent).

- [x] **Scaffold plugin-router package** (ref: Architecture & Design)
  Task ID: phase-1-scaffold-03
  > **Implementation**: Create `packages/plugin-router/package.json`, `packages/plugin-router/tsconfig.json`, `packages/plugin-router/src/index.ts` (empty plugin shell).
  > **Details**: `package.json`: name `"oxlint-plugin-router"`, main `"src/index.ts"`, deps `{"@oxlint/plugins": "latest"}`, devDeps `{"eslint": "^9", "oxlint": "latest"}`. `tsconfig.json`: extend root `../../tsconfig.json`. `src/index.ts`: export a skeleton `eslintCompatPlugin({ meta: { name: "oxlint-plugin-router" }, rules: {} })`.

- [x] **Scaffold plugin-query package** (ref: Architecture & Design)
  Task ID: phase-1-scaffold-04
  > **Implementation**: Create `packages/plugin-query/package.json`, `packages/plugin-query/tsconfig.json`, `packages/plugin-query/src/index.ts`.
  > **Details**: Same pattern as router. Name: `"oxlint-plugin-query"`. Empty plugin shell.

- [x] **Scaffold plugin-functional package** (ref: Architecture & Design)
  Task ID: phase-1-scaffold-05
  > **Implementation**: Create `packages/plugin-functional/package.json`, `packages/plugin-functional/tsconfig.json`, `packages/plugin-functional/src/index.ts`.
  > **Details**: Same pattern. Name: `"oxlint-plugin-functional"`. No external deps (no `is-immutable-type`, no `deepmerge-ts`).

- [x] **Scaffold plugin-solid package** (ref: Architecture & Design)
  Task ID: phase-1-scaffold-06
  > **Implementation**: Create `packages/plugin-solid/package.json`, `packages/plugin-solid/tsconfig.json`, `packages/plugin-solid/src/index.ts`.
  > **Details**: Same pattern. Name: `"oxlint-plugin-solid"`. No external deps — `is-html`, `kebab-case`, `known-css-properties`, `style-to-object` will all be inlined.

- [x] **Install dependencies and verify setup** (ref: Technical Requirements)
  Task ID: phase-1-scaffold-07
  > **Implementation**: Run `bun install` at root. Create a trivial test in `packages/plugin-router/tests/setup.test.ts` and run `bun test`.
  > **Details**: Verify: (1) `@oxlint/plugins` resolves, (2) `eslintCompatPlugin` is importable, (3) `bun test` runs. Create `.oxlintrc.json` at root as placeholder for dogfooding.

---

## Phase 2: Router Plugin (2 rules)

- [x] **Create sortDataByOrder utility** (ref: Architecture & Design)
  Task ID: phase-2-router-01
  > **Implementation**: Create `packages/plugin-router/src/utils/sort-data-by-order.ts`.
  > **Details**: Port from `router/packages/eslint-plugin-router/src/rules/create-route-property-order/create-route-property-order.utils.ts`. Extract the `sortDataByOrder()` function (~60 lines). Remove `@typescript-eslint/utils` type imports — use plain ESTree types or inline. This utility compares property positions against a defined order and returns fix data.

- [x] **Create router constants** (ref: Architecture & Design)
  Task ID: phase-2-router-02
  > **Implementation**: Create `packages/plugin-router/src/utils/constants.ts`.
  > **Details**: Port from `router/packages/eslint-plugin-router/src/rules/create-route-property-order/constants.ts` and `route-param-names/constants.ts`. Include `createRoutePropertyOrder` (property ordering array) and route param validation constants. Combine into single file.

- [x] **Port route-param-names rule** (ref: Implementation Phases)
  Task ID: phase-2-router-03
  > **Implementation**: Create `packages/plugin-router/src/rules/route-param-names.ts`.
  > **Details**: Port from `router/packages/eslint-plugin-router/src/rules/route-param-names/`. Convert from `create()` to `createOnce()` pattern. Inline import detection from `detect-router-imports.ts`: track `@tanstack/react-router` imports in a closure variable, reset in `Program` visitor. Port `extractParamsFromPath()` and `getInvalidParams()` inline or as local helpers. Replace `AST_NODE_TYPES.X` with string literals. Remove `ESLintUtils.RuleCreator` — use plain object `{ meta: {...}, createOnce(context) {...} }`.

- [x] **Port create-route-property-order rule** (ref: Implementation Phases)
  Task ID: phase-2-router-04
  > **Implementation**: Create `packages/plugin-router/src/rules/create-route-property-order.ts`.
  > **Details**: Port from `router/packages/eslint-plugin-router/src/rules/create-route-property-order/`. Convert to `createOnce()`. Inline import detection (same pattern as route-param-names). Use `sortDataByOrder` utility. Preserve fix logic — `context.report({ fix(fixer) { ... } })`. Reset per-file import state in `Program` visitor.

- [x] **Wire rules into plugin-router index** (ref: Architecture & Design)
  Task ID: phase-2-router-05
  > **Implementation**: Edit `packages/plugin-router/src/index.ts`.
  > **Details**: Import both rules, register in `eslintCompatPlugin({ rules: { "create-route-property-order": rule1, "route-param-names": rule2 } })`. Export as default. Add recommended config with both rules enabled as `"error"`.

- [x] **Write router plugin tests** (ref: Success Criteria)
  Task ID: phase-2-router-06
  > **Implementation**: Create `packages/plugin-router/tests/route-param-names.test.ts` and `packages/plugin-router/tests/create-route-property-order.test.ts`.
  > **Details**: Use `RuleTester` from `eslint`. Port key valid/invalid test cases from `router/packages/eslint-plugin-router/src/__tests__/`. At minimum: (1) route-param-names: valid route with correct params, invalid with mismatched params. (2) create-route-property-order: valid ordered properties, invalid unordered with expected fix output. Run with `bun test packages/plugin-router`.

---

## Phase 3: Functional Plugin (8 rules)

### Priority Rules (used in user's config)

- [x] **Port no-let rule** (ref: Implementation Phases)
  Task ID: phase-3-functional-01
  > **Implementation**: Create `packages/plugin-functional/src/rules/no-let.ts`.
  > **Details**: Port from `eslint-plugin-functional/src/rules/no-let.ts`. Simplest rule — `VariableDeclaration` visitor checks `node.kind === "let"`. Convert to `createOnce()`. Support `allowInForLoopInit` option: check `node.parent.type === "ForStatement"` (or `ForInStatement`/`ForOfStatement`). Replace `createRule()` wrapper with plain object. No per-file state needed.

- [x] **Port no-throw-statements rule** (ref: Implementation Phases)
  Task ID: phase-3-functional-02
  > **Implementation**: Create `packages/plugin-functional/src/rules/no-throw-statements.ts`.
  > **Details**: Port from `eslint-plugin-functional/src/rules/no-throw-statements.ts`. `ThrowStatement` visitor. Support `allowInAsyncFunctions` option: walk `node.parent` chain to find enclosing function, check if it's async. Port `getEnclosingFunction()` and `isInFunctionBody()` as local helpers from `eslint-plugin-functional/src/utils/tree.ts`. Convert to `createOnce()`.

- [x] **Port prefer-property-signatures rule** (ref: Implementation Phases)
  Task ID: phase-3-functional-03
  > **Implementation**: Create `packages/plugin-functional/src/rules/prefer-property-signatures.ts`.
  > **Details**: Port from `eslint-plugin-functional/src/rules/prefer-property-signatures.ts`. Visit `TSMethodSignature` nodes. Auto-fix: convert `method(): ReturnType` to `method: () => ReturnType`. Support `ignoreIfReadonlyWrapped` option: check parent node for `TSTypeReference` with `Readonly` type name. Convert to `createOnce()`.

- [x] **Create immutability utility** (ref: Architecture & Design)
  Task ID: phase-3-functional-04
  > **Implementation**: Create `packages/plugin-functional/src/utils/immutability.ts`.
  > **Details**: Implement AST-only `ReadonlyShallow` checking. Functions needed: `hasReadonlyModifier(property)` — checks `TSPropertySignature.readonly` or `TSIndexSignature.readonly`. `isReadonlyArrayType(typeNode)` — checks for `ReadonlyArray<T>`, `readonly T[]`, `ReadonlyMap`, `ReadonlySet`. `isShallowReadonly(typeNode)` — walks a type literal/interface body checking all properties have `readonly` modifier and array types use readonly variants. Do NOT implement `ReadonlyDeep` or `Immutable` levels.

- [x] **Port prefer-immutable-types rule (ReadonlyShallow only)** (ref: Implementation Phases)
  Task ID: phase-3-functional-05
  > **Implementation**: Create `packages/plugin-functional/src/rules/prefer-immutable-types.ts`.
  > **Details**: Port from `eslint-plugin-functional/src/rules/prefer-immutable-types.ts`. Implement ONLY `ReadonlyShallow` enforcement. Visit `FunctionDeclaration`, `FunctionExpression`, `ArrowFunctionExpression`, `TSPropertySignature`, `VariableDeclarator`. Check parameters, return types, and variable types for shallow readonly using `immutability.ts` utility. Support per-category options: `parameters`, `returnTypes`, `variables` each with `enforcement` (`"ReadonlyShallow"` only) and `ignoreNamePattern`. Convert to `createOnce()`. Document that `ReadonlyDeep`/`Immutable` enforcement is unsupported.

- [x] **Port type-declaration-immutability rule (ReadonlyShallow only)** (ref: Implementation Phases)
  Task ID: phase-3-functional-06
  > **Implementation**: Create `packages/plugin-functional/src/rules/type-declaration-immutability.ts`.
  > **Details**: Port from `eslint-plugin-functional/src/rules/type-declaration-immutability.ts`. For `ReadonlyShallow` + `AtLeast` comparator: visit `TSTypeAliasDeclaration` and `TSInterfaceDeclaration`, check that all properties in the type body have `readonly` modifier. Use `immutability.ts` utility. Support `identifiers` pattern matching (regex on type name) and `ignoreInterfaces` option. Convert to `createOnce()`. Document: only works for inline type definitions, cannot resolve type aliases.

### Nice-to-Have Rules

- [x] **Port no-promise-reject rule** (ref: Implementation Phases)
  Task ID: phase-3-functional-07
  > **Implementation**: Create `packages/plugin-functional/src/rules/no-promise-reject.ts`.
  > **Details**: Port from `eslint-plugin-functional/src/rules/no-promise-reject.ts`. Visit `CallExpression` where callee is `Promise.reject`. Also check `new Promise((resolve, reject) => { reject(...) })` pattern. Convert to `createOnce()`.

- [x] **Port immutable-data rule** (ref: Implementation Phases)
  Task ID: phase-3-functional-08
  > **Implementation**: Create `packages/plugin-functional/src/rules/immutable-data.ts`.
  > **Details**: Port from `eslint-plugin-functional/src/rules/immutable-data.ts`. 4 visitors: `AssignmentExpression` (mutation via `obj.x = y`), `UnaryExpression` (`delete obj.x`), `UpdateExpression` (`obj.x++`), `CallExpression` (mutating methods like `.push()`, `.splice()`). Port options: `ignoreClasses`, `ignoreMapsAndSets`, `ignoreImmediateMutation`, `ignoreNonConstDeclarations`, `ignoreIdentifierPattern`. Port ignore/pattern utilities from `eslint-plugin-functional/src/utils/ignore.ts` as local helpers. Convert to `createOnce()`.

- [x] **Port readonly-type rule** (ref: Implementation Phases)
  Task ID: phase-3-functional-09
  > **Implementation**: Create `packages/plugin-functional/src/rules/readonly-type.ts`.
  > **Details**: Port from `eslint-plugin-functional/src/rules/readonly-type.ts`. Visit `TSTypeLiteral` AST nodes. Check and enforce `readonly` modifier on properties. Auto-fix to add `readonly` keyword. Convert to `createOnce()`. **Risk**: Verify oxlint parser produces `TSTypeLiteral` nodes for `.ts` files — test early.

- [x] **Create tree and ignore utilities** (ref: Architecture & Design)
  Task ID: phase-3-functional-10
  > **Implementation**: Create `packages/plugin-functional/src/utils/tree.ts` and `packages/plugin-functional/src/utils/ignore.ts`.
  > **Details**: `tree.ts`: Port `getEnclosingFunction()`, `isInFunctionBody()` from `eslint-plugin-functional/src/utils/tree.ts`. `ignore.ts`: Port pattern matching utilities (`shouldIgnorePattern`, `isIgnoredViaIdentifierPattern`) from `eslint-plugin-functional/src/utils/ignore.ts`. Keep only what's needed by the 8 rules being ported. No `@typescript-eslint/utils` imports.

- [x] **Wire rules into plugin-functional index** (ref: Architecture & Design)
  Task ID: phase-3-functional-11
  > **Implementation**: Edit `packages/plugin-functional/src/index.ts`.
  > **Details**: Import all 8 rules, register in `eslintCompatPlugin()`. Export recommended config matching user's actual ESLint config: `no-let: "error"`, `no-throw-statements: "error"`, `prefer-property-signatures: "error"`, `prefer-immutable-types: ["error", { enforcement: "ReadonlyShallow" }]`, `type-declaration-immutability: ["error", { enforcement: "ReadonlyShallow" }]`. Nice-to-have rules off by default.

- [x] **Write functional plugin tests** (ref: Success Criteria)
  Task ID: phase-3-functional-12
  > **Implementation**: Create test files in `packages/plugin-functional/tests/` — one per rule (8 files).
  > **Details**: Use `RuleTester` from `eslint`. Port key test cases from `eslint-plugin-functional/src/rules/*/`. Priority tests: (1) `no-let`: const valid, let invalid, for-loop-init option. (2) `no-throw-statements`: throw invalid, async function option. (3) `prefer-property-signatures`: method sig invalid, property sig valid, fix output. (4) `prefer-immutable-types`: ReadonlyShallow enforcement on params/returns/vars. (5) `type-declaration-immutability`: interface with all readonly props valid, missing readonly invalid. Run with `bun test packages/plugin-functional`.

---

## Phase 4: Solid Plugin (20 rules)

### Batch 1: Simple JSX Rules (8 rules)

- [x] **Create solid plugin utilities** (ref: Architecture & Design)
  Task ID: phase-4-solid-01
  > **Implementation**: Create `packages/plugin-solid/src/utils/jsx.ts`, `packages/plugin-solid/src/utils/imports.ts`.
  > **Details**: `jsx.ts`: Inline `isDOMElementName()` (check against Set of HTML tag names — port from `is-html` package, ~120 tag names), `isJSXElementOrFragment()`, `getJSXAttributeName()`, `getJSXAttributeValue()`. `imports.ts`: Import tracking utilities — track solid-js imports per file, provide helpers like `isSolidImport()`. Both files: no external deps, pure AST helpers.

- [x] **Port jsx-no-duplicate-props rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-02
  > **Implementation**: Create `packages/plugin-solid/src/rules/jsx-no-duplicate-props.ts`.
  > **Details**: Port from `eslint-plugin-solid/.../rules/jsx-no-duplicate-props.ts`. Visit `JSXOpeningElement`, collect attribute names, report duplicates. Convert to `createOnce()`. Simple Set-based duplicate detection.

- [x] **Port jsx-no-script-url rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-03
  > **Implementation**: Create `packages/plugin-solid/src/rules/jsx-no-script-url.ts`.
  > **Details**: Visit `JSXAttribute` with value containing `javascript:` URLs. Convert to `createOnce()`.

- [x] **Port jsx-uses-vars rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-04
  > **Implementation**: Create `packages/plugin-solid/src/rules/jsx-uses-vars.ts`.
  > **Details**: Visit `JSXOpeningElement`, mark referenced variables as used via `context.markVariableAsUsed()`. Convert to `createOnce()`.

- [x] **Port no-innerhtml rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-05
  > **Implementation**: Create `packages/plugin-solid/src/rules/no-innerhtml.ts`.
  > **Details**: Visit `JSXAttribute` and `MemberExpression` to detect `innerHTML`/`outerHTML` usage. Report with suggestion to use `textContent` instead. Convert to `createOnce()`.

- [x] **Port self-closing-comp rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-06
  > **Implementation**: Create `packages/plugin-solid/src/rules/self-closing-comp.ts`.
  > **Details**: Visit `JSXElement` with no children. Auto-fix to self-closing `<Comp />`. Support `html` and `component` options for controlling which elements to enforce. Convert to `createOnce()`.

- [x] **Port no-react-specific-props rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-07
  > **Implementation**: Create `packages/plugin-solid/src/rules/no-react-specific-props.ts`.
  > **Details**: Visit `JSXAttribute` and flag React-specific props: `className` → `class`, `htmlFor` → `for`, etc. Auto-fix with correct Solid equivalents. Convert to `createOnce()`.

- [x] **Port no-unknown-namespaces rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-08
  > **Implementation**: Create `packages/plugin-solid/src/rules/no-unknown-namespaces.ts`.
  > **Details**: Visit `JSXNamespacedName` and validate prefix against known Solid namespaces (`on`, `oncapture`, `use`, `prop`, `attr`). Convert to `createOnce()`.

- [x] **Port no-proxy-apis rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-09
  > **Implementation**: Create `packages/plugin-solid/src/rules/no-proxy-apis.ts`.
  > **Details**: Visit `CallExpression` and flag APIs incompatible with Solid's proxy system (`Object.keys`, `Object.values`, `Object.entries`, spread on reactive objects, etc.). Convert to `createOnce()`.

### Batch 2: Import/Naming Rules (3 rules)

- [x] **Port imports rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-10
  > **Implementation**: Create `packages/plugin-solid/src/rules/imports.ts`.
  > **Details**: Visit `ImportDeclaration` and enforce correct solid-js import sources. Map APIs to correct packages: `solid-js` (core), `solid-js/web` (render, hydrate, Portal), `solid-js/store` (createStore, produce). Auto-fix incorrect import paths. Convert to `createOnce()`.

- [x] **Port event-handlers rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-11
  > **Implementation**: Create `packages/plugin-solid/src/rules/event-handlers.ts`.
  > **Details**: Port from `eslint-plugin-solid/.../rules/event-handlers.ts`. Validate event handler naming on JSX elements. Include the 74+ standard DOM event names as a const Set. Check `on:*` and `oncapture:*` namespace handlers. Convert to `createOnce()`.

- [x] **Port no-react-deps rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-12
  > **Implementation**: Create `packages/plugin-solid/src/rules/no-react-deps.ts`.
  > **Details**: Flag React-style dependency arrays in Solid code (e.g., `createEffect(() => {...}, [dep])`). Visit `CallExpression` for Solid reactive primitives, check if second argument is an array expression. Convert to `createOnce()`.

### Batch 3: JSX Preference Rules (3 rules, auto-fix heavy)

- [x] **Port prefer-show rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-13
  > **Implementation**: Create `packages/plugin-solid/src/rules/prefer-show.ts`.
  > **Details**: Visit JSX expressions with ternary (`{cond ? <A/> : <B/>}`). Auto-fix to `<Show when={cond} fallback={<B/>}><A/></Show>`. Handle nested ternaries and `&&` short-circuit patterns. Convert to `createOnce()`.

- [x] **Port prefer-for rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-14
  > **Implementation**: Create `packages/plugin-solid/src/rules/prefer-for.ts`.
  > **Details**: Visit JSX expressions with `.map()` calls (`{items.map(item => <li>{item}</li>)}`). Auto-fix to `<For each={items}>{(item) => <li>{item}</li>}</For>`. Convert to `createOnce()`.

- [x] **Port prefer-classlist rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-15
  > **Implementation**: Create `packages/plugin-solid/src/rules/prefer-classlist.ts`.
  > **Details**: Visit `JSXAttribute` named `class` with ternary/template literal values. Auto-fix to `classList={{ "class-a": cond }}`. Convert to `createOnce()`.

### Batch 4: Medium Complexity Rules

- [x] **Port style-prop rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-16
  > **Implementation**: Create `packages/plugin-solid/src/rules/style-prop.ts`.
  > **Details**: Inline `style-to-object` CSS string parser (~30 lines) and `known-css-properties` as a const Set (~350 property names). Visit `JSXAttribute` named `style`. Validate: object syntax preferred over string, check property names against known CSS properties, flag unknown properties. Convert to `createOnce()`.

- [x] **Port jsx-no-undef rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-17
  > **Implementation**: Create `packages/plugin-solid/src/rules/jsx-no-undef.ts`.
  > **Details**: Visit `JSXOpeningElement` with identifier names. Use `context.sourceCode.getScope()` to check if variable is defined. Handle Solid control flow components (`Show`, `For`, `Switch`, `Match`, `Index`, `Portal`, `Dynamic`, `ErrorBoundary`, `Suspense`, `SuspenseList`) — suggest auto-import from `solid-js` if undefined. Convert to `createOnce()`.

- [x] **Port no-array-handlers rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-18
  > **Implementation**: Create `packages/plugin-solid/src/rules/no-array-handlers.ts`.
  > **Details**: Detect array index used in event handlers inside `.map()` or `<For>`. Visit `JSXAttribute` event handlers, check if callback references an outer `.map()` index parameter. Convert to `createOnce()`.

### Batch 5: Complex Rules

- [x] **Port no-destructure rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-19
  > **Implementation**: Create `packages/plugin-solid/src/rules/no-destructure.ts`.
  > **Details**: Port from `eslint-plugin-solid/.../rules/no-destructure.ts`. Detect props destructuring in component functions. Track function scope stack in `createOnce` closure. Auto-fix: wrap with `mergeProps()` for default values or `splitProps()` for selective extraction. Multiple fix strategies depending on pattern (simple destructure, rest element, nested). Convert to `createOnce()`, reset scope stack in `Program` visitor.

- [x] **Port components-return-once rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-20
  > **Implementation**: Create `packages/plugin-solid/src/rules/components-return-once.ts`.
  > **Details**: Port from `eslint-plugin-solid/.../rules/components-return-once.ts`. Track function scopes, detect multiple return paths containing JSX. Auto-fix wraps in `<Show>`/`<Switch>` control flow components. Maintain function scope stack in closure, reset in `Program`. Convert to `createOnce()`.

- [x] **Create trace utility for variable resolution** (ref: Architecture & Design)
  Task ID: phase-4-solid-21
  > **Implementation**: Create `packages/plugin-solid/src/utils/trace.ts`.
  > **Details**: Port from `eslint-plugin-solid/.../utils.ts` (the `trace()` function). Resolves variable references across assignments using `context.sourceCode.getScope()`. Follows `const x = y` chains to find original values. Critical for `reactivity` rule. Remove ESLint compat layer — use `context.sourceCode` directly.

- [x] **Create traverse utility** (ref: Architecture & Design)
  Task ID: phase-4-solid-22
  > **Implementation**: Create `packages/plugin-solid/src/utils/traverse.ts`.
  > **Details**: Port `find()` and `findParent()` traversal helpers. Replace `estraverse` usage with manual `node.parent` chain walking (oxlint supports `node.parent`). Simple recursive utilities.

- [x] **Port reactivity rule** (ref: Implementation Phases)
  Task ID: phase-4-solid-23
  > **Implementation**: Create `packages/plugin-solid/src/rules/reactivity.ts`.
  > **Details**: Port from `eslint-plugin-solid/.../rules/reactivity.ts` (~1000+ lines). This is the most complex rule. Maintain scope stack for reactive contexts (component functions, createEffect, createMemo, etc.). Track signal/memo/props/derived values. Use `trace()` utility for variable resolution. Detect: (1) reading signals in non-tracking scopes, (2) wrapping non-reactive values in reactive primitives unnecessarily, (3) accessing `.value` on wrong types. Port incrementally: start with core signal detection + scope tracking, then add edge cases. Convert to `createOnce()`, reset scope stack in `Program`.

- [x] **Wire all 20 rules into plugin-solid index** (ref: Architecture & Design)
  Task ID: phase-4-solid-24
  > **Implementation**: Edit `packages/plugin-solid/src/index.ts`.
  > **Details**: Import all 20 rules, register in `eslintCompatPlugin()`. Export recommended config matching `eslint-plugin-solid`'s recommended settings. All rules enabled as `"warn"` or `"error"` per original defaults.

- [x] **Write solid plugin tests** (ref: Success Criteria)
  Task ID: phase-4-solid-25
  > **Implementation**: Create test files in `packages/plugin-solid/tests/` — one per rule (20 files).
  > **Details**: Use `RuleTester` from `eslint`. Port key test cases from `eslint-plugin-solid/.../test/`. Priority: test `reactivity` rule thoroughly (most complex), test all auto-fix rules with expected output, test `jsx-no-undef` with scope analysis. Run with `bun test packages/plugin-solid`.

---

## Phase 5: Query Plugin (6 rules)

- [x] **Create query plugin utilities** (ref: Architecture & Design)
  Task ID: phase-5-query-01
  > **Implementation**: Create `packages/plugin-query/src/utils/constants.ts`, `packages/plugin-query/src/utils/ast-utils.ts`, `packages/plugin-query/src/utils/detect-query-imports.ts`, `packages/plugin-query/src/utils/sort-data-by-order.ts`.
  > **Details**: `constants.ts`: Port TanStack Query function names, hook names from `query/packages/eslint-plugin-query/src/rules/*/constants.ts`. `ast-utils.ts`: Port `getProperty()`, `findParent()`, `isIdentifierOrMemberExpression()` helpers. `detect-query-imports.ts`: Inline import detection as closure helpers (not HOF wrapper). `sort-data-by-order.ts`: Same sorting utility as router (can duplicate or share).

- [x] **Create createPropertyOrderRule factory** (ref: Architecture & Design)
  Task ID: phase-5-query-02
  > **Implementation**: Create `packages/plugin-query/src/utils/create-property-order-rule.ts`.
  > **Details**: Port the shared factory for property ordering rules from query plugin source. Adapts to `createOnce` pattern. Takes order config and hook names, returns a rule object. Used by both `infinite-query-property-order` and `mutation-property-order`.

- [x] **Port no-rest-destructuring rule** (ref: Implementation Phases)
  Task ID: phase-5-query-03
  > **Implementation**: Create `packages/plugin-query/src/rules/no-rest-destructuring.ts`.
  > **Details**: Port from `query/packages/eslint-plugin-query/src/rules/no-rest-destructuring/`. Visit `VariableDeclarator` with `ObjectPattern` containing `RestElement` where init is a TanStack Query hook call. Track imports per-file. Convert to `createOnce()`, reset import state in `Program`.

- [x] **Port stable-query-client rule** (ref: Implementation Phases)
  Task ID: phase-5-query-04
  > **Implementation**: Create `packages/plugin-query/src/rules/stable-query-client.ts`.
  > **Details**: Port from `query/packages/eslint-plugin-query/src/rules/stable-query-client/`. Visit `NewExpression` for `QueryClient` constructor. Check if it's inside a component/function body (not at module scope). Use `node.parent` chain to find enclosing function. Convert to `createOnce()`.

- [x] **Port infinite-query-property-order rule** (ref: Implementation Phases)
  Task ID: phase-5-query-05
  > **Implementation**: Create `packages/plugin-query/src/rules/infinite-query-property-order.ts`.
  > **Details**: Use `createPropertyOrderRule` factory. Pass infinite query hook names and property order config. Auto-fix reorders properties. Convert to `createOnce()`.

- [x] **Port mutation-property-order rule** (ref: Implementation Phases)
  Task ID: phase-5-query-06
  > **Implementation**: Create `packages/plugin-query/src/rules/mutation-property-order.ts`.
  > **Details**: Use `createPropertyOrderRule` factory. Pass mutation hook names and property order config. Same pattern as infinite-query-property-order. Convert to `createOnce()`.

- [x] **Port no-unstable-deps rule** (ref: Implementation Phases)
  Task ID: phase-5-query-07
  > **Implementation**: Create `packages/plugin-query/src/rules/no-unstable-deps.ts`.
  > **Details**: Port from `query/packages/eslint-plugin-query/src/rules/no-unstable-deps/`. Visit `CallExpression` for query hooks. Track multiple state maps (query keys, dependencies). Detect unstable references in query key arrays. Convert to `createOnce()`, reset all maps in `Program`.

- [x] **Port exhaustive-deps rule** (ref: Implementation Phases)
  Task ID: phase-5-query-08
  > **Implementation**: Create `packages/plugin-query/src/rules/exhaustive-deps.ts`.
  > **Details**: Port from `query/packages/eslint-plugin-query/src/rules/exhaustive-deps/`. Most complex query rule. Uses `context.sourceCode.scopeManager` for scope analysis. Port `getExternalRefs()` and `isRelevantReference()` utilities. Detect variables referenced inside query functions that aren't in the query key. Convert to `createOnce()`. **Risk**: Test scope manager compatibility with oxlint thoroughly.

- [x] **Wire rules into plugin-query index** (ref: Architecture & Design)
  Task ID: phase-5-query-09
  > **Implementation**: Edit `packages/plugin-query/src/index.ts`.
  > **Details**: Import all 6 rules, register in `eslintCompatPlugin()`. Export recommended config with all rules enabled.

- [x] **Write query plugin tests** (ref: Success Criteria)
  Task ID: phase-5-query-10
  > **Implementation**: Create test files in `packages/plugin-query/tests/` — one per rule (6 files).
  > **Details**: Use `RuleTester` from `eslint`. Port key test cases from `query/packages/eslint-plugin-query/src/__tests__/`. Priority: test `exhaustive-deps` scope analysis edge cases, test property ordering fix output, test import detection (only flag code using `@tanstack/query` imports). Run with `bun test packages/plugin-query`.

---

## Phase 6: Integration Testing & Polish

- [x] **Create oxlint integration test suite** (ref: Success Criteria)
  Task ID: phase-6-polish-01
  > **Implementation**: Create `tests/integration/` at root with fixture files and a test runner.
  > **Details**: Write fixture `.ts`/`.tsx` files with known-good and known-bad code for each plugin. Run `oxlint` CLI with plugin config against fixtures. Assert expected diagnostics appear and no false positives on clean code. Test auto-fix output where applicable.

- [x] **Create .oxlintrc.json for dogfooding** (ref: Success Criteria)
  Task ID: phase-6-polish-02
  > **Implementation**: Create `.oxlintrc.json` at project root.
  > **Details**: Configure oxlint to use all 4 plugins against the project's own source code. Enable rules relevant to the codebase (functional rules for the plugin source itself).

- [x] **Verify dual ESLint compatibility** (ref: Success Criteria)
  Task ID: phase-6-polish-03
  > **Implementation**: Create `tests/eslint-compat/` with a test that loads each plugin in ESLint.
  > **Details**: Import each plugin, verify `eslintCompatPlugin` wrapper produces valid ESLint plugin objects. Run a simple `RuleTester` test through ESLint (not oxlint) for at least one rule per plugin. Confirms dual compatibility.

- [x] **Add package.json exports for npm publishing** (ref: Success Criteria)
  Task ID: phase-6-polish-04
  > **Implementation**: Edit each `packages/*/package.json`.
  > **Details**: Add `"exports": { ".": { "import": "./src/index.ts" } }`, `"main": "src/index.ts"`, `"types": "src/index.ts"`, `"files": ["src"]`. Add `"keywords"`, `"description"`, `"license"`, `"repository"` fields. Verify `bun publish --dry-run` works for each package.

---

*Generated by Clavix /clavix:plan*
