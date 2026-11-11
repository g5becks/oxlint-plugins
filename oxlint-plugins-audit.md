# oxlint-plugins Audit — six JS plugins for Oxlint

| | |
|---|---|
| **Repository** | `/Users/takinprofit/Dev/oxlint-plugins` (`g5becks/oxlint-plugins`, branch `main`, clean). **3 commits** in total; last 2026-02-22. |
| **Packages** | `oxlint-plugin-errorset@0.1.1`, `oxlint-plugin-immutable@0.1.1` (dir `plugin-functional`), `oxlint-plugin-ts-no-assert@0.1.2` (dir `plugin-no-type-assertion`), `oxlint-plugin-query@0.1.1`, `oxlint-plugin-router@0.1.1`, `oxlint-plugin-solidjs@0.1.1` (dir `plugin-solid`): 42 rules |
| **Audit date** | 2026-11-08 |
| **Oxlint versions exercised** | **1.47.0** (lockfile era), **1.69.0** (agentx's pin), **1.92.0** (latest, 2026-11-06) |
| **Other tooling exercised** | ESLint 9.39 and **10.14**, typescript-eslint 8.72, upstream `eslint-plugin-solid@0.19.0`, `@tanstack/eslint-plugin-query@5.107.1`, `@tanstack/eslint-plugin-router@1.162.0`, `eslint-plugin-functional@10.0.1`; TypeScript 5.9.3 / 7.0.2; Bun 1.4.4 |
| **Primary consumer** | `agentx`: root/server configs use `immutable`, `ts-no-assert`, `errorset`; the client config uses `router`, `query`, `immutable`, `solidjs`, `ts-no-assert`. Every lint task runs with `--deny-warnings`, and the lefthook pre-commit hook runs `oxlint --fix`. |

---

## 0. Executive Summary

These plugins are agentx's code-quality guardrails. The audit ran every plugin inside **real oxlint binaries** (not only the ESLint-based unit tests) on three oxlint versions, against agentx's code and a violation corpus. It also compared the ports **rule by rule against the original ESLint plugins** they replace.

### Highest-risk findings

1. **An oxlint breaking change in 1.70.0 is blocking agentx's upgrade.** [Measured, bisected]
   - Oxlint 1.70.0 ("Normalize oxlint jsPlugin prefixes", #23335) strips `oxlint-plugin-` from plugin names. Long-form **config keys** still work, but long-form **suppression comments** (`// oxlint-disable-next-line oxlint-plugin-immutable/no-let`) **stop suppressing**, and the short form doesn't exist before 1.70.
   - agentx has **168 long-form suppressions in 90 files** and pins oxlint at exactly 1.69.0; `mise.toml` mentions the disable-comment change.
   - Upgrading to 1.92 produces **86 new diagnostics** (45 root / 32 server / 9 client). Each is verified to sit under one of those suppressions, and `--deny-warnings` turns them into failing lint tasks. **No single spelling works on both sides of 1.70**, so the migration must be atomic.

2. **`solidjs/jsx-no-undef` leaks state across files, nondeterministically, with an autofix.** [Repro]
   - `missingComponentsSet` lives in the `createOnce` closure and is never reset. After one file misses an import, **every later file in that worker** reports "'Show' should be imported from 'solid-js'", including `.ts` files with no JSX.
   - The count changes run to run on identical input: **37, 434, 251** spurious reports in three runs.
   - The rule's **fix inserts the import**, and agentx runs `oxlint --fix` in its client `lint` task and pre-commit hook.

3. **The errorset plugin is inert in agentx, and has false positives and unsafe fixes where it does run.** [Repro]
   - All five rules short-circuit unless the file imports `@takinprofit/errorset` directly. agentx imports its sets from `@agentx/core`, so **0 of 3** probe violations are reported in that pattern.
   - Where the rules do run, 4 of 5 idiomatic patterns are false positives: guard clauses, ternaries, an unrelated `.data` in another function, and a guard on a returned value inside `catch`.
   - `prefer-guard-over-manual-kind-check` suggests the **wrong set** (`OrderError.not_found(r)`).
   - `no-throw-errorset` has a **code autofix** that rewrites `throw` → `return` inside `.map()` callbacks and `try`/`finally`, which changes runtime behavior. It's latent only because finding (3a) keeps the rule silent.

4. **`immutable/type-declaration-immutability` misses most mutable shapes.** [Repro + upstream comparison]
   Against upstream `eslint-plugin-functional`, which agrees with the expected results on 21 of 22 cases, the port has **8 false negatives**: unions, `T[]`, `Map`, mapped types, `Partial`, `Record`, `Array<…>`, mutable tuples. It has **1 false positive**: `readonly items: string[]`.

5. **The published packages aren't what the repo contains.** [Measured]
   The npm bundles differ from a build of `main`. Unreleased fixes include the query plugin's React import check (published: `=== "React"`, never true), `stable-query-client`'s `useState` detection, and `immutable-data` map/set messages.

6. **The test suite can't detect any of the above.** [Measured]
   - Unit tests run rules under **ESLint's `RuleTester` with typescript-eslint**, not oxlint's runtime, and are thin: `reactivity`, 970 lines, has **1 valid and 0 invalid** cases.
   - The only real-oxlint suite (CLI) fails **89 of 104 tests on oxlint 1.92**: 73 from plugin names renamed before publishing, 16 from the 1.70 change. It doesn't cover `errorset` or `ts-no-assert` at all.
   - The bench suite fails 4 of 4.
   - **3,000+ lines of vendored upstream TanStack tests never run.**

### What's in good shape
- **19 of 22** Solid/Query/Router rules match their upstream originals **site for site** on a 111-file violation corpus.
- **No rule output changed** between oxlint 1.69 and 1.92 across 39,000+ diagnostics on 710 files, apart from finding 2 and file discovery. That includes the AST changes in 1.77, 1.78 and 1.88.
- All plugins load and run under **ESLint 10.14**.
- oxlint validates options against each rule's `meta.schema`, and every preset passes once its prefix is corrected.
- `no-type-assertion` is correct.
- Our plugins add little lint time except Solid's `reactivity` (~47 ms on agentx's client).

### Recommended release
**`0.2.0` of all six packages**, released together and coordinated with an agentx change that:
1. renames the 168 suppressions to short names,
2. switches config keys to short names, and
3. bumps oxlint to ≥ 1.92,

all **in a single commit**. Do it after the correctness fixes in Phase 1. See §6.

### Baseline health (measured)

| Check | Result |
|---|---|
| `bun install --frozen-lockfile` | ❌ fails: `bun.lock` out of sync with the manifests ("eslint was removed in packages/plugin-query") |
| Unit tests, ESLint RuleTester (`test:*`) | ✅ 129 pass (router 5, query 12, functional 28, solid 20, ts-no-assert 22, errorset 42) + 19 integration/compat |
| CLI tests in real oxlint (`test:cli`, 104 tests) | ❌ oxlint 1.47: 31 pass / 73 fail · 1.69: 31 / 73 · **1.92: 15 / 89** |
| Bench (`test:bench`) | ❌ 0 / 4 ("Plugin 'solid' not found") |
| `bun run check` (`tsc -b`, TS 5.9) | ❌ **339 errors** (152 TS6305 project-reference; 58 in shipped non-vendored code); `plugin-errorset` not in `references` |
| `tsc -b` on TS 7.0.2 | ❌ `TS5102: Option 'baseUrl' has been removed` in package tsconfigs |
| Plugins on agentx code (oxlint 1.69, published *and* local builds) | ✅ 0 diagnostics in all three configs |
| Same code, oxlint 1.92 | ❌ **86 diagnostics**: suppressions no longer honored |
| Plugins under ESLint 10.14 | ✅ load and run, 0 crashes |
| CI / repo lint / hooks | ❌ none (`.github/`, lint config and lefthook all absent) |

### Evidence & severity legend
**[Repro]** confirmed by running real oxlint on a probe file · **[Upstream]** compared against the original ESLint plugin on identical input · **[Measured]** a number from a command · **[Code]** read from source (location given) · **[Changelog]** from the oxlint CHANGELOG/docs.
**Critical** breaks the agentx lint gate or silently changes code/behavior · **High** a guardrail is ineffective or wrong in common use · **Medium** an edge case, accuracy gap or DX defect · **Low** polish.

---

## 1. Upstream API & Breaking Changes (Oxlint 1.43 → 1.92)

### Context
- JS plugins were promoted to **alpha** in oxlint 1.55.0 (2026-03-12) and are still alpha.
- The oxlint versioning page lists JS plugins under "**Features Not Subject to Semver** — The plugin API and behavior may change without notice."
- So any oxlint minor or patch can break these packages, and they need **pinned, tested compatibility ranges**.
- The `@oxlint/plugins` package (helpers + `eslintCompatPlugin`) has a CHANGELOG with only its 1.42.0 initial-release entry. Plugin runtime behavior comes from the **oxlint binary**, not from `@oxlint/plugins`.

### U1 — Plugin-name normalization (1.70.0) breaks suppression comments · **Critical** · [Repro][Changelog][Measured]
Changelog: oxlint 1.70.0 (2026-06-15) "linter: Normalize oxlint jsPlugin prefixes (#23335)". It extends the existing `eslint-plugin-*` normalization (diagnostics since 1.63.0) to `oxlint-plugin-*`. **Bisected: 1.69.0 = old behavior, 1.70.0 = new.**

| Spelling | ≤ 1.69 config key | ≤ 1.69 disable comment | ≥ 1.70 config key | ≥ 1.70 disable comment | Diagnostic code ≥ 1.70 |
|---|---|---|---|---|---|
| `oxlint-plugin-ts-no-assert/no-type-assertion` | ✅ | ✅ | ✅ (back-compat) | ❌ **ignored** | `ts-no-assert(no-type-assertion)` |
| `ts-no-assert/no-type-assertion` | ❌ "Plugin 'ts-no-assert' not found" | ❌ ignored | ✅ | ✅ | |

Normalized names: `immutable`, `ts-no-assert`, `errorset`, `query`, `router`, `solidjs`. The third-party `complexity` and `inhuman` were already short.

> **agentx impact (measured):**
> - **168 long-form suppressions in 90 files:** `immutable/no-let` 103, `ts-no-assert/no-type-assertion` 33, `immutable/type-declaration-immutability` 18, `immutable/no-throw-statements` 10, `solidjs/reactivity` 4.
> - On a source copy linted with agentx's unmodified configs, oxlint 1.69 → 1.92 adds **86 diagnostics** (45 root / 32 server / 9 client). All 86 were verified to sit directly under a long-form suppression; the other suppressions are in files the lint tasks exclude.
> - agentx pins `oxlint` to `1.69.0`, the last version before the change.
> - Because no spelling works on both sides of 1.70, the migration must rename the suppressions, rename the config keys, and bump oxlint **in the same commit** (§6, OX-40).

Related naming changes: 1.77.0 "Reject duplicate JS plugin names (#25243)" (no collision among ours); 1.78.0 "Normalize customized rule names (#25316)". The docs say `jsdoc` is reserved, and the PR summary suggests `eslint` is reserved too (not verified verbatim). None of our names collide.

### U2 — JS-plugin capabilities to adopt · **Medium** · [Changelog]

| Version | Capability | How to use it here |
|---|---|---|
| 1.43.0 | **`RuleTester` in oxlint** (`oxlint/plugins-dev`, verified in the 1.92 package exports) | Run unit tests inside oxlint's real runtime instead of ESLint's (T1). |
| 1.44.0 | **Suggestions** implemented | Convert unsafe autofixes to suggestions (R3, R7). |
| 1.56.0 | `sourceCode.markVariableAsUsed` | `solidjs/jsx-uses-vars` no longer crashes. On 1.47 it crashed 165× on our corpus with "`context.markVariableAsUsed` not implemented yet". The README's "disable under Oxlint" advice is stale (R9). |
| 1.63.0 | `SourceCode.getDisableDirectives` | Optional: detect stale long-form directives and offer a migration rule or codemod (OX-41). |
| 1.84.0 | JS plugin rule timings (`--debug=timings`) | Per-rule profiling. *On 1.92 this flag printed no timing table in our runs; verify the invocation before relying on it.* |
| — | `context.settings` (exported `Settings` type) | Configure errorset re-export modules (R1). |
| 1.52 / 1.56 / 1.57 / 1.60 | Lazy token/comment deserialization, raw-transfer and `Int32Array` buffers, cached tokens | Free speedups on upgrade. Avoid APIs that force eager materialization (e.g. calling `getTokens` across whole files) in hot visitors. |

### U3 — API removals and changes: verified safe · **Low** · [Code][Repro]
- **1.52.0 "Remove getters from `Context`".** Every `context.getSourceCode()` / `getScope()` / `markVariableAsUsed()` call in shipped code is behind a guarded fallback: `plugin-solid/src/upstream/compat.ts:17-52`, `plugin-solid/src/utils/trace.ts:8-9`, `plugin-query/src/utils/ast-utils.ts:202-203`. Remove the fallbacks once the minimum oxlint is ≥ 1.70.
- **1.56.0 `hashbang` removed from AST**: not used.
- **AST "BREAKING" entries in 1.62, 1.77, 1.78, 1.88** (export declarations, `ArrowFunctionBody`, `ClassHeritage`, comment attachment): an all-rules cross-version diff over **710 files and ~39,000 diagnostics** found **no output change** between 1.69 and 1.92, apart from U1 naming, the R4 leak, and 2 `.test.js` files newly discovered by 1.92. 1.47 → 1.69 differences were the `jsx-uses-vars` crash.
- AST node fields are **own enumerable keys** on 1.47, 1.69 and 1.92, verified with a probe plugin. So `reactivity`'s hand-written `walkTree` (`Object.keys(node)`, `plugin-solid/src/rules/reactivity.ts:88-108`) works, but it depends on an undocumented object shape (the prototype isn't `Object.prototype`). Prefer the visitor API, or a key list from `@oxlint/plugins` ESTree types.

### U4 — No declared compatibility contract · **High** · [Code]
- None of the six packages declares `peerDependencies.oxlint` (or `eslint`).
- Every README claims "Oxlint `>= 1.0.0`". That's false: JS plugins reached alpha at 1.55, `jsx-uses-vars` crashes before 1.56, and suppression semantics flipped at 1.70.
- `engines.node: ">=18.0.0"`, while oxlint 1.92 requires `^20.19.0 || >=22.12.0`.
- The root `dependencies` has `"@oxlint/plugins": "latest"` (locked 1.43.0; latest 1.92.0), and that copy's `eslintCompatPlugin` is **bundled** into every `dist/index.js`. The bundled 1.43 compat layer predates the `after`-hook ordering fixes in 1.44 and 1.58; no current rule uses `after`, so impact is latent.

**Fix:** `peerDependencies: { "oxlint": ">=1.70.0 <2", "eslint": ">=9" }`, with `eslint` optional via `peerDependenciesMeta`. Pin `@oxlint/plugins` exactly. Raise `engines` to oxlint's floor. Test a version matrix in CI (T6).

---

## 2. Rule Implementation & Ergonomics

### 2.1 `oxlint-plugin-errorset` (5 rules)

#### R1 — All rules are inert unless the file imports `@takinprofit/errorset` directly · **High** · [Repro][Code]
`createErrorsetImportTracker` (`plugin-errorset/src/utils/detect-errorset-imports.ts:6,39`) sets `importedFromErrorset` only when the source is exactly `"@takinprofit/errorset"`. It collects guard names only from `const X = errorSet(...).init()` declarations **in the same file**. All rules return early when `!tracker.hasErrorsetImport()` (e.g. `no-throw-errorset.ts:111`, `no-unguarded-data-access.ts:158/173`).
Probe results:
- Set defined in the same file: **4 of 4** expected results.
- Set imported from `@agentx/core` (agentx's universal pattern): **0 of 3** violations reported.

agentx's error sets are all defined in `core/src/errors.ts` and imported by 68+ files, so these "error"-level rules enforce nothing.
**Fix:** a plugin setting read from `context.settings.errorset`:

```json
"settings": { "errorset": { "modules": ["@takinprofit/errorset", "@agentx/core"], "guardPattern": "^[A-Z]\\w*(Error|Err)$" } }
```

Treat identifiers imported from those modules that match the pattern as error-set guards. Keep the same-file detection. Document it in the README and ship it in the preset. **Do R3 first**, or enabling detection activates an unsafe autofix.

#### R2 — `no-unguarded-data-access` false positives on idiomatic code · **High** · [Repro][Code]
Five probes; **4 false positives**:

| Pattern | Result |
|---|---|
| Guard clause: `if (!UserError(r)) return r.id; return r.data.id` | ❌ reported. agentx's own conventions (`inhuman` guard-clause rules) favor this style. |
| `fetchJson()` result `r.data.length` in a **different function** that never touches errorset | ❌ reported. Guarded-variable tracking is **per file, by name** (`guardedVarNames: Set<string>`, `no-unguarded-data-access.ts:~95`), with no scope analysis. |
| `UserError(r) ? r.data.id : r.id` | ❌ reported (only `IfStatement` consequents count as guarded, `isInsideGuardBlock` lines 9-35) |
| `if (UserError(r)) { return r.data.id }` | ✅ ok |

The rule also has a **false-negative order dependency**. `guardedVarNames` is filled during traversal, so an unguarded access that appears *before* the first guard call is never reported.
**Fix:** resolve variables through `sourceCode.getScope(node)` and track per `Variable`, not per name. Model narrowing for `if`/`else` (including negated guards with early exit), conditional expressions and `&&`.

#### R3 — `no-throw-errorset` autofix changes runtime semantics · **Critical (latent)** · [Repro]
`meta.fixable: "code"`. The fix rewrites `throw X.kind\`…\`(…)` → `return X.kind…` and is applied by plain `oxlint --fix`. Repro outputs:
- inside `ids.map((id) => { if (!id) throw … })` → `return …`: the callback now **returns an error object into the array**;
- inside `try { throw … } finally { … }` → `return …`: a different control-flow and type contract.

agentx runs `bunx oxlint --fix` in lefthook pre-commit and in the client/server `lint` tasks. Today R1 keeps the rule silent; once R1 is fixed, **commits would rewrite control flow without review**.
**Fix:** make it a **suggestion** (`hasSuggestions: true`, `fix` → `suggest`). Offer it only when the throw is directly in the body of the enclosing function, not inside a callback, `try` or loop.

#### R4 — `prefer-guard-over-manual-kind-check` suggests the wrong set · **Medium** · [Repro][Code]
With `OrderError` and `UserError` both in scope, the message and suggestion for `if (UserError(r)) { if (r.kind === "not_found") … }` are "Use the kind-level guard **`OrderError.not_found(r)`**". It uses the *first guard declared in the file* (`prefer-guard-over-manual-kind-check.ts`, "best guess: first guard in file"), and `OrderError` has no `not_found` kind, so applying the suggestion produces broken code.
**Fix:** take the set name from the enclosing guard call that narrowed the variable (it's already found by `isAlreadyGuardedVariable`).

#### R5 — `no-catch-errorset` flags legitimate guards inside `catch` · **Medium** · [Repro][Code]
`catch { const r = fallback(); if (UserError(r)) return r }` is reported ("will never match"). The rule flags **any** guard call inside a `CatchClause` (`no-catch-errorset.ts`, `isInsideCatch`), not only guards applied to the caught parameter.
**Fix:** report only when the guard's argument resolves to the catch parameter, or to a variable assigned from it.

#### R6 — Design notes · **Low**
- All five rules re-run the same import tracker independently: 5 trackers and 5× the `ImportDeclaration`/`VariableDeclaration` work per file. That's negligible today (~3 ms on agentx root) but easy to share.
- `no-new-error-in-errorset-fn` only matches `throw new Error`, not `return new Error` (noted in agentx's enforcement audit).

### 2.2 `oxlint-plugin-immutable` (8 rules; agentx uses 4 at `error`)

#### R7 — `type-declaration-immutability` misses most non-literal shapes · **High** · [Repro][Upstream]
The rule inspects only `TSTypeLiteral` and `TSIntersectionType` aliases plus interfaces (`type-declaration-immutability.ts:84-117`). On a 22-case probe run in **real oxlint 1.92**, compared with **upstream `eslint-plugin-functional@10.0.1`** (type-aware, `ReadonlyShallow` / `AtLeast`), which matched expectations on 21 of 22:

| Declaration | Upstream | Port |
|---|---|---|
| `{ a: string } \| { b: string }` | report | **ok (miss)** |
| `string[]` | report | **ok (miss)** |
| `Map<string, number>` | report | **ok (miss)** |
| `{ [K in "a" \| "b"]: string }` | report | **ok (miss)** |
| `Partial<{ a: string }>` | report | **ok (miss)** |
| `Record<string, number>` | report | **ok (miss)** |
| `Array<{ readonly a: string }>` | report | **ok (miss)** |
| `[string, number]` | report | **ok (miss)** |
| `{ readonly items: string[] }` | **ok** (shallow) | **report (false positive)** |
| the other 13 cases | match | match |

JS plugins can't use type information (oxlint docs: "Lint rules that rely on TypeScript type-awareness" are not supported), so the syntactic port should still cover these syntactic forms:
- union constituents;
- `TSArrayType` / `TSTupleType` at the top level (mutable unless the `readonly` operator is used);
- `TSMappedType` without a `readonly` modifier;
- well-known mutable references (`Array`, `Map`, `Set`, `Record`, `Partial`, `Required`, `Pick`, `Omit` over a mutable literal);
- and `ReadonlyShallow` semantics for `readonly x: T[]`, which upstream accepts.

> **agentx impact:** small, because agentx consistently uses the `Readonly<{…}>` idiom. A single-line scan finds ~8 aliases (`Record` 3, `T[]` 2, `Map`/`Set` 1, mapped 2) that the port never checks. The 18 existing suppressions are genuine mutations, plus one stale `// eslint-disable-next-line functional/…` in `client/src/components/ui/button.tsx:37`.

#### R8 — The other immutable rules · **Low** · [Code]
- **`no-let`:** correct. Reports the whole `VariableDeclaration` and supports `allowInForLoopInit`. Upstream also offers `allowInFunctions` and `ignoreIdentifierPattern`; consider adding them for parity.
- **`no-throw-statements`:** correct, with `allowInAsyncFunctions`. Upstream renamed related options in later majors; document the mapping.
- **Unreleased change:** the published `immutable-data` uses one message for map `set` and set `add`; the repo has a new `mapOrSet` message. Its `defaultOptions` also changed from `[{}]` to `[]`.

### 2.3 `oxlint-plugin-solidjs` (20 rules)

#### R9 — `jsx-no-undef` cross-file state leak with an autofix · **Critical** · [Repro][Measured]
`const missingComponentsSet = new Set()` is created **once** in `createOnce` (`plugin-solid/src/rules/jsx-no-undef.ts:118`). It's filled in `checkIdentifierInJSX` and read in `"Program:exit"`, but never cleared, and the rule has no `before()` hook.
- Repro: `a.tsx` uses `<Show>` without an import, and `b1…b5.tsx` are clean. With `--threads 1`, **all six files** report "'Show' should be imported from 'solid-js'." on both 1.69 and 1.92.
- Nondeterminism: three identical runs over 710 files produced **37, 434 and 251** spurious reports, most of them in `.ts` files that can't contain JSX.
- **The report carries a fix** (`appendImports`/`insertImports`, lines 214-230), so `--fix` inserts `import { Show } from "solid-js"` into unrelated files.
- The same leak occurs under ESLint (13 of 16 "should be imported" reports were in files not using the component), because `eslintCompatPlugin` reuses the `createOnce` closure. The unit tests just never run a valid case after an invalid one.

agentx's client is clean only because no client file currently lacks a Solid import; the first file that does will contaminate others in CI and pre-commit. agentx enables the rule at `error`.
**Fix:** reset per-file state in `before()`. Add a regression test that runs a valid file after an invalid one (T1). Audit all `createOnce` rules for closure state (R10).

#### R10 — `createOnce` closure state across all rules · **High** · [Code]
A scan of every `createOnce` body for closure-level `Set`/`Map`/arrays/trackers, and whether they're reset in `before()`:
- **errorset ×5, query ×4, router ×2:** state is reset in `before()` ✅.
- **`jsx-no-undef`:** not reset ❌ (R9).
- **`reactivity`:** `const scopeStack = new ScopeStack()` once per worker. Its `syncCallbacks: Set` (`reactivity.ts:135`) has nodes added (`:559, 568, 587, 595`) and **never cleared**: unbounded retention of AST node objects from every file the worker lints. That's a memory leak, but correctness held across file orders in our probe. Upstream eslint-plugin-solid creates a fresh `ScopeStack` per file in `create()`; the port introduced this by moving to `createOnce`.
- **`jsx-no-duplicate-props`:** state is per visit, OK.

**Fix:** create the `ScopeStack` in `before()` (or clear `syncCallbacks` and the signal/prop lists there). Add a lint rule or unit check to the repo that flags closure-level mutable state not reset in `before()`.

#### R11 — Parity with upstream `eslint-plugin-solid` · [Upstream][Measured]
On a 111-file corpus (repo fixtures, bench fixtures, the old `client/` copy, all directives stripped), with the same rule set as agentx's client config:

| Rule | Upstream | Port | Both |
|---|---|---|---|
| `components-return-once`, `event-handlers`, `imports`, `jsx-no-duplicate-props`, `jsx-no-script-url`, `no-destructure`, `no-innerhtml`, `no-react-deps`, `no-react-specific-props`, `no-unknown-namespaces`, `prefer-for`, `self-closing-comp`, `style-prop` | 31 | 31 | **31** (identical sites) |
| `reactivity` | 9 | 10 | 9 (1 extra: `makePersisted(createSignal(…))` destructuring in `auth-store.tsx:34`) |
| `jsx-no-undef` | 4 | 23 | 3 (the R9 leak) |

On agentx's own client (104 files, directives stripped) upstream reports 2 `reactivity` sites and the port 1 (it misses `WatchlistSheet.tsx:604`); all other rules report 0 in both.
**`jsx-uses-vars`:** the README says to disable it under oxlint. That was right before 1.56 (it crashed); it works from 1.56. Decide whether to re-enable it; agentx sets it `off`.

### 2.4 `oxlint-plugin-query` (6) & `oxlint-plugin-router` (2)

#### R12 — Parity with upstream TanStack plugins · [Upstream]
On the same corpus:
- 5 of 6 Query rules and the Router rule match upstream **site for site**: `infinite-query-property-order` 2/2, `mutation-property-order` 2/2, `no-rest-destructuring` 3/3, `no-unstable-deps` 2/2, `stable-query-client` 3/3, `create-route-property-order` 3/3.
- `exhaustive-deps` finds the same 2 problems but reports them **one line lower**: on the `queryKey` property instead of the `useQuery(` options object. Align `node:` with upstream so editor squiggles and `disable-next-line` placement match.
- `stable-query-client` is React-specific by design (`isSpecificTanstackQueryImportByName(..., "@tanstack/react-query")`). Document that it's a no-op for Solid.
- Import detection (`/^@tanstack\/.+-query$/`, `/^@tanstack\/.+-router$/`) correctly includes `@tanstack/solid-query` and `@tanstack/solid-router`, which agentx uses.

#### R13 — `route-param-names` has no upstream counterpart test · **Low**
It isn't in `@tanstack/eslint-plugin-router@1.162.0`'s rule set, so it's a custom rule, covered only by 2–3 unit tests. Add oxlint-runtime tests (T1).

### 2.5 `oxlint-plugin-ts-no-assert` (1 rule)

#### R14 — Correct; one portability smell · **Low** · [Code]
It covers `as`, `<T>`, and `!` non-null, allows `as const` / `as unknown`, and correctly ignores `satisfies`. The `as const` check must accept **two different ASTs**, `TSTypeOperator(const)` in oxlint and `TSTypeReference("const")` in typescript-eslint (`no-type-assertion.ts:6-19`). That is direct evidence that ESLint-based unit tests exercise a different AST than production (T1).

### 2.6 Cross-cutting ergonomics

#### R15 — Shipped `recommended` presets use the wrong rule prefix · **High** · [Measured]
**All 39 preset entries** across the six plugins use short, unprefixed names (`functional/no-let`, `no-type-assertion/no-type-assertion`, `query/…`, `router/…`, `errorset/…`, `solid…`). Those match neither the plugin's `meta.name` (`oxlint-plugin-immutable`, …) nor its ≥ 1.70 normalized name (`immutable`, `ts-no-assert`, …). The presets are unusable in oxlint, and in ESLint they only work if the user happens to register the plugin under that exact key. With corrected prefixes, every preset passes oxlint's schema validation.
**Fix:** generate preset keys from the normalized name (`immutable/…`, `ts-no-assert/…`, `solidjs/…`, …). Add a test that loads each preset into real oxlint.

#### R16 — Options are schema-validated by oxlint; keep schemas exact · **Medium** · [Repro]
oxlint rejects invalid options with "Options validation failed for rule …" and **aborts the run**, verified on 1.69 and 1.92. Schemas are therefore part of the public API: a too-strict schema breaks configs, and a too-loose one hides typos. Add schema tests that check valid and invalid option sets per rule.

#### R17 — Rules are untyped · **Medium** · [Measured]
The 59 shipped rule/util files contain **454 `: any`**, with **0** `defineRule()` wrappers and **0** imports of `@oxlint/plugins` types. That's why `bun run check` reports 39 TS2322 errors in the `index.ts` files: `meta.type` is inferred as `string`. It also means oxlint's ESTree changes (1.62, 1.77, 1.78, 1.88) **can't be caught at compile time**.
**Fix:** wrap rules in `defineRule({...})` and type visitors with `ESTree` from `@oxlint/plugins`. Enable `noImplicitAny` for `src/` (excluding `upstream/`).

---

## 3. Performance & Reliability

### P1 — Lint cost of JS plugins on agentx (measured; oxlint 1.92, `--threads 1`, median of 5)

| Scope | No JS plugins | All configured JS plugins | Removing each plugin saves… |
|---|---|---|---|
| client (104 files) | 39 ms | 169 ms | **solidjs ≈ 47 ms**; complexity (3rd-party) ≈ 14 ms; query ≈ 2; router ≈ 1; immutable ≈ 1; ts-no-assert ≈ 0; inhuman ≈ 1 |
| root: core/infra/worker/plugins (151 files) | 32 ms | 152 ms | **complexity (3rd-party) ≈ 121 ms**; inhuman ≈ 16; errorset ≈ 3; immutable ≈ 0; ts-no-assert ≈ 0 |

Removals are **not strictly additive**, because the JS runtime start-up cost is shared. Treat these as rankings, not exact budgets. Of our plugins, only Solid (dominated by `reactivity`) is material, at ~0.45 ms/file. In absolute terms all of this is small, about 150 ms per task; it matters mostly for editor/LSP latency and pre-commit.

### P2 — `reactivity` hot spots · **Medium** · [Code]
- **Memory:** an unbounded `syncCallbacks` Set (R10). In LSP mode the worker lives for the whole editor session, so retained AST nodes grow with every file opened. This wasn't measured; add an allocation check using 1.91's allocation tracking or a heap snapshot in a long run.
- **Recursion:** `walkTree` (`reactivity.ts:88-108`) is unbounded recursive descent over `Object.keys(node)`, run inside visitors (`:690`). It risks stack exhaustion on very deep generated JSX and does redundant re-walks. Prefer collecting the needed info in the main visitor pass, or use an explicit stack.
- **Scope lookups:** `findVariable` walks scopes by name for each lookup (`:53-63`). Cache per `Identifier`.

### P3 — Per-file early exit · **Low** · [Code]
- JSX-only Solid rules run on `.ts` files too. Several rules could return early for files with no JSX (e.g. `before()` checking `context.filename` for `.tsx`/`.jsx`, if the API supports skipping; verify against the current docs).
- Query and Router rules already early-return when no TanStack import was seen.
- Errorset could skip whole files when no configured module is imported (after R1).

### P4 — Reliability: crashes abort a plugin for the whole file · **Medium** · [Measured]
On oxlint 1.47, one rule crash ("Error running JS plugin", 165×) dropped the Solid plugin's other diagnostics for those files: 31,638 diagnostics vs 39,312 on 1.69 for the same input. Guard risky APIs with capability checks (as the compat shims do), and keep a minimum oxlint version where all used APIs exist (U4).

---

## 4. Testing & Quality Assurance

### T1 — Unit tests run in ESLint, not in oxlint · **High** · [Code][Measured]
Every `packages/*/tests/*.test.ts` uses `RuleTester` from **`eslint`** with **`@typescript-eslint/parser`**. Consequences:
- **Different AST:** see R14's `as const` dual-shape.
- **Different scope manager and `sourceCode` implementation.**
- The **`createOnce` lifecycle under the ESLint compat wrapper differs from oxlint's per-worker reuse.** R9 and R10 are exactly this class of bug.
- **No coverage of oxlint-only behavior:** schema validation, plugin naming, disable directives, fixes applied by oxlint.

Oxlint has shipped its own `RuleTester` since 1.43.0 (`import { RuleTester } from "oxlint/plugins-dev"`), which runs rules in oxlint's runtime.
**Fix:** move all unit tests to oxlint's `RuleTester`. Keep a thin ESLint compatibility suite (the README promises ESLint support; verified working on ESLint 10.14).

### T2 — Unit tests are thin · **High** · [Measured]

| Plugin | Rules | Unit tests | Notes |
|---|---|---|---|
| solid | 20 | 20 (one file per rule) | `reactivity` (970 lines): **1 valid, 0 invalid** |
| query | 6 | 12 | ~2 cases per rule |
| router | 2 | 5 | |
| functional | 8 | 28 | `type-declaration-immutability` misses 8 of 22 shapes (R7), so no test covers them |
| ts-no-assert | 1 | 22 | good |
| errorset | 5 | 42 | all cases define the set in-file, so R1/R2/R4/R5 are invisible |

### T3 — 3,000+ lines of vendored upstream tests never run · **High** · [Measured]
`packages/plugin-query/src/upstream/_tests_upstream/` holds the TanStack test suites: `exhaustive-deps.upstream.ts` (1,088 lines), `no-rest-destructuring` (394), `no-void-query-fn` (325), `mutation-property-order` (218), `infinite-query-property-order` (222), `stable-query-client` (192), `no-unstable-deps` (204). They sit under `src/`, outside every test glob. These are the highest-value parity tests available.
**Fix:** adapt them to run against the ports (oxlint `RuleTester`), first as a parity report, then as gating tests with a documented list of intentional divergences. Do the same for eslint-plugin-solid's upstream tests: fetch them, pinned to the upstream version the port follows.

### T4 — The CLI (real-oxlint) suite is broken; the bench suite too · **High** · [Measured]
- `tests/cli/*.cli.test.ts` builds four plugins into `ROOT/dist/plugin-*` and runs `bunx oxlint`.
  - **73 failures on every version:** configs use the pre-publish plugin names `oxlint-plugin-solid/…` and `oxlint-plugin-functional/…` ("Plugin 'oxlint-plugin-solid' not found").
  - **+16 failures on ≥ 1.70:** assertions match diagnostic codes like `oxlint-plugin-query(…)`, which 1.70 renamed to `query(…)`. This is every Query and Router assertion.
- `bunx oxlint` is **unpinned**, so the suite tests whatever is newest on npm at run time.
- The suite builds and covers only router, query, functional and solid. **errorset and ts-no-assert have no real-oxlint tests.**
- `tests/bench/bench.test.ts`: **0 of 4 pass** (same stale names). It also doesn't include `reactivity`, the most expensive rule (P1).

### T5 — Missing test classes · **High**

| Class | Would have caught |
|---|---|
| **Multi-file / state isolation:** lint invalid file then valid file in one process | R9, R10 |
| **Cross-version matrix:** same fixtures on min / pinned / latest oxlint, diff normalized output | U1, P4 |
| **Upstream parity harness:** run the original ESLint plugin and the port on the same corpus, diff sites (the method used in this audit) | R7, R11, R12 |
| **Fix-safety tests:** apply `--fix` and type-check or execute the output | R3, R9 |
| **Preset smoke test:** load each `configs.recommended` into oxlint | R15 |
| **Schema tests:** valid and invalid options per rule | R16 |
| **Suppression tests:** directive names honored on supported versions | U1 |
| **Consumer-pattern fixtures:** re-exported error sets, guard clauses, ternaries | R1, R2 |

### T6 — No CI · **High**
There are no workflows, and the frozen install fails (H1).
**Fix:** CI that runs, on oxlint {**1.70.0** (new floor), **pinned current**, **latest**}: frozen install → typecheck → unit (oxlint `RuleTester`) → CLI → parity report (non-blocking at first) → ESLint 9 and 10 compat smoke → pack and install smoke test of each package. Add a scheduled weekly run against `oxlint@latest`, because JS plugins are explicitly outside semver (U1 context).

---

## 5. Code Hygiene & Chores

| ID | Item | Evidence | Action |
|---|---|---|---|
| H1 | `bun.lock` out of sync; `--frozen-lockfile` fails | "eslint was removed in packages/plugin-query" | Regenerate and commit; enforce frozen installs in CI. |
| H2 | Unpinned toolchain: `@oxlint/plugins: latest` (bundled into every dist), `@types/bun: latest`, `bunx oxlint` in tests | package.json, cli-runner.ts:84-92 | Pin exactly; add oxlint as a pinned devDependency and call its binary. |
| H3 | Published bundles ≠ repo source | npm `dist` vs local build: immutable −479 B, query +1.1 KB, solid +338 B, router +78 B. Unreleased fixes include query's `"React"` → `"react"` import check (published version never matches) and `stable-query-client` `useState` detection | Release from CI only, from tagged commits; add `CHANGELOG.md` per package. |
| H4 | `bun run check`: 339 errors (TS 5.9); TS 7: `baseUrl` removed (TS5102); `plugin-errorset` missing from `references` | measured | Fix configs (drop `baseUrl`, add errorset ref); type the rules (R17); make `check` gate CI on TS 7.0. |
| H5 | Wrong repository URL in all six package.json files: `https://github.com/takinprofit/biome-plugins` | package.json ×6 | Point to `g5becks/oxlint-plugins` (with `directory`); add `homepage` and `bugs`. |
| H6 | Root `README.md` is a single line: `# Biome-Plugins` | README.md | Real README: packages table, version compatibility, migration notes for 1.70. |
| H7 | Package READMEs claim "Oxlint `>= 1.0.0`"; Solid README's `jsx-uses-vars` advice is stale; no suppression-name guidance | READMEs ×6 | State the tested range (`>= 1.70`), document short names and the migration (OX-41). |
| H8 | `engines.node: ">=18"` vs oxlint `^20.19.0 \|\| >=22.12.0`; no `peerDependencies` | package.json ×6 | See U4. |
| H9 | `client/`: an 80-file copy of the agentx client (`@agentx/client`), referenced by no test | `grep` | Delete it, or turn it into an explicit parity fixture under `tests/fixtures/`. |
| H10 | Vendored `src/upstream/` (query 4,495 lines, solid 4,253 lines): unpinned, not shipped, not tested; the **sole users** of `estraverse`, `is-html`, `kebab-case`, `known-css-properties`, `style-to-object`, `@typescript-eslint/utils` | `grep` | Move to `vendor/<plugin>@<version>/` with a README recording the upstream commit; run its tests (T3); drop unused devDependencies. |
| H11 | Unused devDependency `oxlint-tsgolint@^0.14.0` (latest 7.0.x) | `grep` (0 uses) | Remove. |
| H12 | ESLint dev pinned to 9; ESLint 10.14 is current | measured: plugins run on 10.14 | Test both 9 and 10. |
| H13 | No repo linting or formatting config, no hooks | `ls -a` | Dogfood oxlint (with these plugins where relevant) and a formatter; lefthook pre-commit. |
| H14 | Only 3 commits; no tags | `git log` | Tag 0.1.x retroactively; adopt changesets for six independently versioned packages. |
| H15 | Directory names ≠ package names (`plugin-functional` → `oxlint-plugin-immutable`, `plugin-no-type-assertion` → `oxlint-plugin-ts-no-assert`, `plugin-solid` → `oxlint-plugin-solidjs`). The leftover names caused T4's stale configs | — | Rename the directories to match the packages, or add a single name map used by tests and presets. |

---

## 6. Action Plan / Roadmap

> **Process note for the implementing agent:** this repo has no backlog tooling configured (only a Clavix integration in `CLAUDE.md`). Track these tasks as issues or in a `TASKS.md`; the IDs `OX-xx` are stable references. Every bug fix starts by committing the failing probe from Appendix A as a test **in oxlint's `RuleTester`**.

### Release strategy

| Release | Scope | Notes |
|---|---|---|
| **0.2.0** (all six packages, together) | Phases 0–2 | **Breaking for consumers:** new minimum `oxlint >= 1.70`; presets renamed to short prefixes; `no-throw-errorset` fix → suggestion; errorset detection becomes settings-driven (more reports). Ship with a migration guide + codemod (OX-41). |
| **0.3.0** | Phase 3 | Typed rules, performance, parity-driven accuracy improvements. |

The agentx migration (OX-40) happens **after 0.2.0 is published** and must land in **one commit**, because no suppression spelling works on both sides of oxlint 1.70 (U1).

### Phase 0 — Make the repo trustworthy (no behavior changes)

| ID | Task | Fixes | Acceptance criteria |
|---|---|---|---|
| OX-01 | Reproducible installs & pinned toolchain | H1, H2, H11 | `bun install --frozen-lockfile` succeeds; `@oxlint/plugins`, `@types/bun`, `oxlint` pinned to exact versions; `oxlint-tsgolint` removed; tests call the pinned `node_modules/.bin/oxlint`, never `bunx oxlint`. |
| OX-02 | Single source of plugin names | H15, T4 | A `plugins.ts` map (dir ↔ package ↔ normalized name) used by build, tests and presets; directories optionally renamed; no hard-coded `oxlint-plugin-solid` / `-functional` remains. |
| OX-03 | Repair the CLI and bench suites | T4 | CLI configs use names from OX-02; code assertions normalize `oxlint-plugin-X(…)` ↔ `X(…)`; all 104 CLI tests pass on pinned oxlint; bench 4/4 passes and includes `solidjs/reactivity`; CLI covers **all six** plugins. |
| OX-04 | Typecheck green on TS 7 | H4 | `baseUrl` removed; `plugin-errorset` added to `references`; `tsc -b` passes on TS 7.0.x (`upstream/` excluded or typed). |
| OX-05 | CI with an oxlint matrix | T6, U4 | Workflow on oxlint {1.70.0, pinned, latest} × {unit, CLI}; ESLint 9 + 10 compat smoke tests; weekly scheduled run against `oxlint@latest`; pack and install smoke test per package. |
| OX-06 | Release hygiene | H3, H5, H14 | Tags for published versions; changesets; per-package CHANGELOG; correct `repository`/`homepage`/`bugs`; publishing only from CI. |

### Phase 1 — Correctness fixes (release-blocking for 0.2.0)

| ID | Task | Fixes | Depends | Acceptance criteria |
|---|---|---|---|---|
| OX-10 | Move unit tests to oxlint's `RuleTester` | T1 | OX-01 | All `packages/*/tests` use `RuleTester` from `oxlint/plugins-dev`; the `as const` dual-shape code in ts-no-assert is reduced to the oxlint shape (keep the ESLint shape only in the compat suite). |
| OX-11 | Fix `jsx-no-undef` state leak | R9 | OX-10 | State reset in `before()`; a test lints [invalid, valid×5] in one run and the valid files report nothing; three repeated multi-threaded runs over the corpus produce identical output. |
| OX-12 | Audit `createOnce` state; fix `reactivity` retention | R10, P2 | OX-10 | `ScopeStack` (incl. `syncCallbacks`) recreated or cleared per file; a repo check (script or rule) fails when closure-level mutable state isn't reset in `before()`. |
| OX-13 | `no-throw-errorset`: fix → suggestion | R3 | OX-10 | `meta.fixable` removed and `hasSuggestions: true`; the suggestion is offered only for throws directly in the enclosing function body; `--fix` never changes `throw` (test). |
| OX-14 | Errorset settings-driven detection | R1 | OX-13 | `settings.errorset.modules` + `guardPattern` supported; the re-export probe (Appendix A) reports 3/3; README and preset updated; same-file detection unchanged. |
| OX-15 | Scope-aware narrowing for `no-unguarded-data-access` | R2 | OX-14 | Guard clauses, ternaries, `&&` chains and negated guards with early return are recognized; tracking is by `Variable`, not name; the 5-case probe returns 5/5; no order-dependent misses. |
| OX-16 | Correct set name in `prefer-guard-over-manual-kind-check` | R4 | OX-14 | Message and suggestion use the narrowing guard's set; a multi-set test. |
| OX-17 | `no-catch-errorset` targets only the caught value | R5 | OX-14 | Guard on a returned value in `catch` is not reported; guard on the catch parameter is. |
| OX-18 | Presets with normalized prefixes | R15, U1 | OX-02 | Every `configs.recommended` key = `<normalized>/<rule>`; a test loads each preset into oxlint ≥ 1.70 and gets no config errors. |
| OX-19 | Compatibility contract | U4, H7, H8 | OX-05 | `peerDependencies.oxlint: ">=1.70.0 <2"` (+ optional `eslint >=9`); `engines.node` aligned with oxlint; READMEs state the tested range and short-name usage. |

### Phase 2 — Accuracy & parity (0.2.0 if time allows, else 0.3.0)

| ID | Task | Fixes | Acceptance criteria |
|---|---|---|---|
| OX-20 | `type-declaration-immutability` syntactic coverage | R7 | The 22-case probe matches upstream on ≥ 21/22: unions, top-level arrays/tuples, mapped types without `readonly`, known mutable generics flagged; `readonly x: T[]` accepted (ReadonlyShallow); documented limits where type info would be needed. |
| OX-21 | Run vendored TanStack upstream tests against the ports | T3, R12 | The upstream suites execute in CI against the ports; divergences listed in `PARITY.md`; `exhaustive-deps` report node aligned with upstream. |
| OX-22 | Solid upstream parity suite | R11, T3 | eslint-plugin-solid's upstream tests (pinned version) run against the ports; the `reactivity` and `makePersisted` divergence resolved or documented; `jsx-uses-vars` re-evaluated for oxlint ≥ 1.70. |
| OX-23 | Parity harness in CI | T5 | A script runs upstream ESLint plugins vs. the ports on a fixed corpus and reports per-rule recall and precision (the method in Appendix A); non-blocking, with thresholds once stable. |
| OX-24 | Fix-safety and schema test suites | T5, R16 | Every fixable rule has a test applying `--fix` and type-checking the output; every rule with options has valid and invalid schema tests. |
| OX-25 | Vendored code housekeeping | H9, H10, H12 | `client/` removed or moved to fixtures; `upstream/` moved to `vendor/<pkg>@<version>/` with provenance; unused devDependencies dropped; ESLint 10 added to the compat matrix. |

### Phase 3 — Types, performance, polish → 0.3.0

| ID | Task | Fixes | Acceptance criteria |
|---|---|---|---|
| OX-30 | Typed rules | R17 | Every rule wrapped in `defineRule`; visitors typed with `@oxlint/plugins` `ESTree`; `noImplicitAny` in `src/`; `: any` count in shipped code reduced by ≥ 90% (from 454). |
| OX-31 | `reactivity` traversal & lookups | P2 | No recursive `walkTree` (explicit stack or visitor-based); variable lookups cached; client lint cost of the Solid plugin reduced by ≥ 30% (from ≈ 47 ms on agentx client, single-threaded). |
| OX-32 | Per-file early exits | P3 | JSX-only rules skip non-JSX files; errorset skips files without configured modules; measured with the bench suite. |
| OX-33 | Shared import trackers | R6 | Errorset rules share one tracker per file. |
| OX-34 | Profiling baseline | P1, U2 | Bench suite records per-plugin cost on a fixed corpus; documented use of oxlint rule timings (once `--debug=timings` output is confirmed). |
| OX-35 | Root README & docs | H6, H7 | Root README with packages, compatibility table, migration guide, contribution and testing instructions. |

### Coordinated agentx migration (after 0.2.0 is published)

| ID | Task | Acceptance criteria |
|---|---|---|
| OX-40 | **Atomic oxlint upgrade in agentx** | One commit that: (1) bumps the six plugins to 0.2.0; (2) rewrites all 168 suppressions `oxlint-plugin-{immutable,ts-no-assert,errorset,query,router,solidjs}/` → `{immutable,ts-no-assert,errorset,query,router,solidjs}/`; (3) rewrites the config keys in `.oxlintrc.json`, `server/.oxlintrc.json` and `client/.oxlintrc.json` the same way; (4) bumps `oxlint` from `1.69.0` to the pinned latest (≥ 1.92); (5) adds `settings.errorset.modules: ["@agentx/core"]`; (6) removes the stale `eslint-disable functional/…` comment in `client/src/components/ui/button.tsx`. Every agentx lint task passes with `--deny-warnings`, and the `mise.toml` comment explaining the pin is updated. |
| OX-41 | Codemod / migration helper | A script shipped in the repo (and referenced in the READMEs) that performs OX-40 steps 2–3 on any codebase. Optionally a one-off rule using `SourceCode.getDisableDirectives` (1.63+) that flags long-form directives. |
| OX-42 | Triage newly active errorset diagnostics | After OX-14, agentx will see errorset reports for the first time. Triage each as fix / justify / rule bug before enabling at `error`; run at `warn` for one cycle. |

---

## Appendix A — Probe harness & key reproductions

All probes run the **built** plugin bundles in **real oxlint** binaries (1.47.0 / 1.69.0 / 1.92.0 installed side by side in the audit scratchpad). Scratch root: `/private/tmp/claude-501/-Users-takinprofit-Dev/239a07a4-30ee-4777-aea1-feeee3c1317b/scratchpad/`:
- `probe/probe.ts`: runs one annotated file and prints ✓/✗ per `// expect: report|ok` line;
- `agentx-copy/`, `agentx-nodirectives/`: agentx sources plus configs with symlinked plugins;
- `parity-corpus/`, `upstream-eslint/`: the upstream comparison;
- `xver/`: the cross-version diff;
- `oxbins/<ver>/`: the oxlint binaries.

The scratchpad is temporary; the essential cases are below.

**Probe file format** (header lines configure the run):
```ts
// rules: {"oxlint-plugin-immutable/type-declaration-immutability": "error"}
// plugins: functional
export type D = { a: string } | { b: string } // expect: report   ← port: ok (miss)
export type E = string[]                      // expect: report   ← port: ok (miss)
export type M = { readonly items: string[] }  // expect: ok       ← port: report (upstream: ok)
```

**U1 — suppression semantics across 1.70:**
```ts
const a = 1 as number                                                       // reported on all versions
// oxlint-disable-next-line oxlint-plugin-ts-no-assert/no-type-assertion
const b = 2 as number                                                       // suppressed ≤1.69, REPORTED ≥1.70
// oxlint-disable-next-line ts-no-assert/no-type-assertion
const c = 3 as number                                                       // REPORTED ≤1.69, suppressed ≥1.70
```

**R9 — `jsx-no-undef` leak:** `a.tsx = export const A = () => <Show when={true}>x</Show>` plus five clean `b*.tsx` files; `oxlint --threads 1 a.tsx b1.tsx … b5.tsx` reports "'Show' should be imported from 'solid-js'." in **all six** files.

**R1 — errorset inert with re-exports:**
```ts
import { UserError } from "@agentx/core"          // (vs. defining it via errorSet() in-file)
export function a() { throw UserError.not_found`missing ${"id"}`({ id: "1" }) }  // expect: report → not reported
```

**R2/R4/R5 — errorset false positives** (set defined in-file):
```ts
if (!UserError(r)) return r.id; return r.data.id         // reported (guard clause)
const r = await fetchJson(); return r.data.length         // reported (different function, same var name)
return UserError(r) ? r.data.id : r.id                    // reported (ternary)
catch { const r = fallback(); if (UserError(r)) return r } // reported by no-catch-errorset
if (UserError(r)) { if (r.kind === "not_found") … }       // suggests OrderError.not_found(r)
```

**R3 — unsafe autofix:** `oxlint --fix` turns `ids.map((id) => { if (!id) throw UserError.not_found…; return id })` into `… return UserError.not_found… …`.

## Appendix B — Commands & measurements

```bash
cd /Users/takinprofit/Dev/oxlint-plugins
bun install --frozen-lockfile        # FAILS (lockfile out of sync)
bun install --ignore-scripts --no-save
bun test ./packages/plugin-*/tests/*.test.ts   # 129 pass
bun test ./tests/integration/*.test.ts ./tests/eslint-compat/*.test.ts  # 19 pass
bun run build                         # 6 bundles: router 14.7K, query 33.5K, functional 25.0K, solid 120.6K, ts-no-assert 5.8K, errorset 28.9K
bun test ./tests/cli/*.cli.test.ts    # oxlint 1.47: 31/104 · 1.69: 31/104 · 1.92: 15/104
bun test ./tests/bench/*.test.ts      # 0/4
bun run check                         # 339 errors (TS 5.9); TS 7.0.2: TS5102 baseUrl
# bisect: oxlint 1.69.0 old naming, 1.70.0 new naming
# agentx (copy, unmodified configs): oxlint 1.69 → 0 diags; 1.92 → 45 + 32 + 9 = 86 (all under long-form suppressions)
# parity corpus (111 files): 61 upstream vs 81 port, 58 shared (recall 95%, precision 72% — jsx-no-undef leak)
# cross-version (710 files, 42 rules): 1.47 = 31,638 diags (165 jsx-uses-vars crashes) · 1.69 = 39,312 · 1.92 = 39,046 (differences = leak + 2 newly discovered .test.js files)
# jsx-no-undef leak, 3 identical runs: 37 / 434 / 251 spurious reports
# ESLint 10.14: all six plugins load and run, 0 fatal errors
```

No tracked files in `oxlint-plugins` or `agentx` were modified (`git status` clean in both). Git-ignored artifacts created in `oxlint-plugins`: `node_modules/` (installed with `--no-save`), `packages/*/dist/`, and `dist/plugin-*` (written by the repo's own CLI/bench suites). The agentx experiments ran on a copy in the scratchpad.

## Appendix C — Oxlint changelog entries relevant to JS plugins (1.43 → 1.92)

From `apps/oxlint/CHANGELOG.md` (read verbatim) and the docs. Abbreviated; see §1 for impact.
- **1.43.0** RuleTester `context.filename` absolute (BREAKING for RuleTester users) · `eslintCompatPlugin` moved into a function · `RuleTester` `cwd` · plugins outside workspace
- **1.44.0** suggestions implemented · `@oxlint/plugins` package · `after` hook ordering in ESLint compat · RuleTester fixes/suggestions
- **1.51.0** Oxc tokens in plugins, tokens via raw transfer · `typescript` removed from bundle
- **1.52.0** **getters removed from `Context`** · `meta.fixable` may be null/undefined · token method return types fixed
- **1.53.0** `oxlint-plugin-eslint` package · `after` hooks always run
- **1.55.0** **JS plugins promoted to alpha**
- **1.56.0** `sourceCode.markVariableAsUsed` · `hashbang` removed from AST · comment/token perf
- **1.57.0** lazy tokens/comments; memory-leak fix in tokens and comments
- **1.58.0** `WeakMap` keyed by `sourceCode` emulation · ESLint-compat `after` fixes
- **1.61.0** `RuleMeta.replacedBy` aligned with ESLint
- **1.62.0** AST size changes (BREAKING, Rust AST) · `respectEslintDisableDirectives` · actual disable-directive prefix reported
- **1.63.0** `SourceCode.getDisableDirectives` · eslint prefixes removed from plugin names in diagnostics
- **1.69.0** spread `Token`/`Comment` keep `loc`
- **1.70.0** **Normalize oxlint jsPlugin prefixes (#23335)** ← U1
- **1.72.0** deduplicate missing-plugin errors · **1.77.0** reject duplicate JS plugin names; AST BREAKING (export declarations, arrow body) · **1.78.0** normalize customized rule names; AST BREAKING (class heritage, …) · **1.81.0** clamp/normalize invalid JS plugin locations · **1.84.0** **JS plugin rule timings** · **1.86.0** selectors included in timings; CFG walker fix · **1.88.0** comment attachment storage (AST BREAKING) · **1.91.0** AST nodes created with `Object.create`; allocation tracking for rules (release notes) · **1.92.0** no JS-plugin entries
- Docs: JS plugins "currently in alpha"; "The plugin API and behavior may change without notice" (not subject to semver); unsupported: custom parsers (Vue/Svelte/Angular), type-aware rules, ESLint APIs removed in v9.
