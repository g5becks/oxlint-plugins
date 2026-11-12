# oxlint-plugin-errorset

Linting rules for [`@takinprofit/errorset`](https://github.com/g5becks/errorset) — enforces correct usage patterns and catches common mistakes at the source. Works with [Oxlint's JS plugin API](https://oxc.rs/docs/guide/usage/linter/plugins) and ESLint flat config.

## Why

`errorset` treats errors as **return values**, not thrown exceptions. A few patterns that look plausible are actually bugs:

```ts
// ❌ Looks right, but errorset values are never thrown
throw UserError.not_found`User not found`({ id })

// ❌ isErr() in a catch block will never match — errorset values can't be caught
try { await getUser(id) } catch (e) { if (isErr(e)) { ... } }

// ❌ Manual .kind check instead of a typed guard
if (isErr(result) && result.kind === "not_found") { ... }
```

This plugin catches all of the above automatically.

## Requirements

- Oxlint `>= 1.70.0 < 2` (tested with 1.70.0 and the pinned version, 1.93.0). Oxlint JS plugins are
  alpha and outside oxlint's semver, so other versions may break; earlier versions use a different
  rule-name scheme (see below).
- Node.js `^20.19.0 || >= 22.12.0` (oxlint's own requirement)
- ESLint `>= 9` (optional, only for the ESLint flat-config path)
- `@takinprofit/errorset` 0.3, 0.4 or 0.5 (see [Supported errorset versions and patterns](#supported-errorset-versions-and-patterns))

## Rule names and suppression comments

On oxlint >= 1.70 the plugin's rules are named `errorset/<rule>` (oxlint strips the
`oxlint-plugin-` prefix). Use that short form everywhere:

```jsonc
// .oxlintrc.json
{ "rules": { "errorset/<rule>": "error" } }
```

```ts
// oxlint-disable-next-line errorset/<rule>
```

The long form `oxlint-plugin-errorset/<rule>` still works as a config key, but **disable comments
with the long form are ignored** on oxlint >= 1.70, and the short form doesn't exist before 1.70.
When upgrading from oxlint <= 1.69, rename suppressions, config keys and the oxlint version
together: the [0.2 migration guide](https://github.com/g5becks/oxlint-plugins/blob/main/docs/migration-0.2.md)
has a codemod that does the renaming. Diagnostics are printed as `errorset(<rule>)`.

## Installation

```sh
npm add -D oxlint-plugin-errorset
# or
bun add -d oxlint-plugin-errorset
```

## Usage with Oxlint

Add the plugin to `jsPlugins` in your `.oxlintrc.json` and enable whichever rules you want:

```json
{
  "jsPlugins": ["./node_modules/oxlint-plugin-errorset/dist/index.js"],
  "rules": {
    "errorset/no-throw-errorset": "error",
    "errorset/no-catch-errorset": "error",
    "errorset/no-new-error-in-errorset-fn": "warn",
    "errorset/prefer-guard-over-manual-kind-check": "warn",
    "errorset/no-unguarded-data-access": "warn"
  }
}
```

The plugin also exports a `recommended` preset (`configs.recommended`) with exactly these rules and
severities. Oxlint can't load a JS plugin's preset directly, so list the rules as above; in
ESLint, spread the preset (below). Preset keys use the plugin's normalized name (`errorset/...`).

## Usage with ESLint

```js
// eslint.config.mjs
import errorsetPlugin from "oxlint-plugin-errorset";

export default [
  {
    plugins: { errorset: errorsetPlugin },
    rules: errorsetPlugin.configs.recommended.rules,
  },
];
```

## Settings: error sets re-exported from your own modules

By default the rules only recognize error sets defined in the same file with
`errorSet(...).init()` from `@takinprofit/errorset`. If your error sets live in a shared
module (for example `export const UserError = errorSet(...).init()` in `@acme/core`, imported
everywhere else), list that module in `settings.errorset.modules`:

```json
{
  "jsPlugins": ["./node_modules/oxlint-plugin-errorset/dist/index.js"],
  "settings": {
    "errorset": {
      "modules": ["@acme/core"],
      "guardPattern": "^[A-Z]\\w*(Error|Err)$"
    }
  },
  "rules": {
    "errorset/no-throw-errorset": "error"
  }
}
```

ESLint reads the same object from its flat-config `settings`.

| Setting | Default | Meaning |
|---|---|---|
| `modules` | `["@takinprofit/errorset"]` | Modules that re-export error sets. A named import from one of them (also aliased: `import { UserError as UE }`) whose **imported** name matches `guardPattern` is treated as an error-set guard; `errorSet` and `isErr` imported from them are recognized too. `@takinprofit/errorset` is always included. |
| `guardPattern` | `^[A-Z]\w*(Error\|Err)$` | Regular expression (a string) the imported name must match. |

Notes:

- Type-only imports (`import type { UserError }`, `import { type UserError }`) are never guards.
- Namespace imports (`import * as core from "@acme/core"` then `core.UserError`) are **not**
  recognized; import the sets by name.
- Invalid settings never break linting: a `modules` value that isn't an array of non-empty
  strings, or a `guardPattern` that doesn't compile, is ignored and the default is used.
- The `recommended` config only lists rules; add `settings.errorset` yourself when your sets
  are re-exported.
- Files whose source never mentions one of the `modules` are skipped entirely (nothing in them
  could be reported). The check is textual, so a module specifier written with escape sequences
  (`"@takinprofit/errorset"`) isn't recognized.

## Supported errorset versions and patterns

The rules recognize the APIs of `@takinprofit/errorset` **0.3, 0.4 and 0.5**. The 0.4 and 0.5
patterns are tested against fixtures that type-check with errorset 0.5.0.

| Pattern | Since | How the rules treat it |
|---|---|---|
| `const X = errorSet("X", ["a", "b"]).init<T>()` | 0.3 | `X` is a set guard; `X.a(v)` is a kind guard; `X.a\`msg\`(data)` / `X.a\`msg\`` create errors |
| `X.a\`msg\`({ cause })` (callable no-context error) | 0.3 | an error creation (still recognized) |
| `X.a\`msg\`.with({ cause })` | 0.4 | an error creation: `throw` is reported by `no-throw-errorset` |
| `errorSet("X", { a: ["id"], b: [] }).init<T>()` (object form) | 0.5 | same as the array form |
| `merge(A, B)` / `A.merge(B)` | 0.4 / 0.5 | a **set-level** guard: narrows and is checked in `catch`, but has no kind guards, so `prefer-guard-over-manual-kind-check` gives no suggestion |
| `err.set === "X"` (and `!==`) | 0.4 | narrows to set `X` (`no-unguarded-data-access`), and lets `prefer-guard-over-manual-kind-check` suggest `X.<kind>(err)` (the set name is mapped to the variable from `errorSet("X", ...)`, or to an import of that name) |
| `isErr(v)` | 0.3 | a guard on any set: narrows, is checked in `catch`, no kind suggestion |
| `X.recover`, `X.inspect`, `X.capture`, `X.captureAsync`, `X.from`, `X.kinds` | 0.3–0.5 | set members, never kind guards (`X.from(body)` doesn't mark `body` as an error) |
| `captureSync(fn, map)` / `captureAsync(fn, map)` | 0.4 | like `X.capture`: throwing inside `fn` is not reported |
| `throw toError(err)` | 0.5 | not reported: `toError` is the sanctioned adapter for APIs that need a thrown `Error` |
| `return new Error(...)` in a function that creates errorset errors | — | reported by `no-new-error-in-errorset-fn`, like `throw new Error(...)` |

---

## Rules

### `no-throw-errorset` 💡

**Severity:** `error`

Errorset values are **returned**, not thrown. Using `throw` with an errorset creation expression is always a bug — the value is discarded instead of being propagated to the caller.

This rule offers a **suggestion** (not an auto-fix) to replace `throw` with `return`, and only where that keeps control flow intact: the `throw` must sit directly in the body of a function that isn't a callback (only blocks and `if`/`else` in between). Inside a callback such as `.map(...)`, a loop, a `switch` or `try`/`catch`/`finally`, `return` would change behavior (for example, put the error value into the mapped array), so no suggestion is offered there and the code must be restructured by hand. `oxlint --fix` never changes a `throw`.

**❌ Incorrect**

```ts
function getUser(id: string) {
  throw UserError.not_found`User ${id} not found`({ id }) // ← discarded!
}

const getUser = (id: string) => {
  throw UserError.invalid`Bad input`
}
```

**✅ Correct**

```ts
function getUser(id: string) {
  return UserError.not_found`User ${id} not found`({ id })
}

const getUser = (id: string) => UserError.invalid`Bad input`
```

> **Note:** `throw` inside a `.capture()` target function is intentional and is exempt from this rule.

---

### `no-catch-errorset`

**Severity:** `error`

Errorset values are returned by functions — they are never thrown, so they can never arrive in a `catch` clause. Applying an errorset guard (`isErr`, a set-level or kind-level guard, or `instanceof`) to the **caught value** will silently never match.

The rule only checks the caught value, resolved through scope analysis: the catch parameter, identifiers bound by a destructured catch parameter (`catch ({ cause })`), and variables assigned directly from them (`const err = e`). Guards on other values in a catch block, such as the result of a fallback call, are fine. It also flags `.kind` access on the caught value, since `e.kind` implies the thrown error is an errorset — which is impossible.

```ts
try { run() } catch {
  const r = fallback()
  if (UserError(r)) return r   // ✅ — r is a returned value, not the caught one
}
```

**❌ Incorrect**

```ts
try {
  await getUser(id)
} catch (e) {
  if (isErr(e)) { ... }            // ❌ isErrInCatch
  if (UserError(e)) { ... }        // ❌ guardInCatch
  if (e instanceof UserError) { }  // ❌ instanceofInCatch
  console.log(e.kind)              // ❌ kindInCatch
}
```

**✅ Correct**

```ts
// Check the return value directly — never use a catch block for errorset
const result = await getUser(id)
if (isErr(result)) { ... }
if (UserError(result)) { ... }
```

---

### `no-new-error-in-errorset-fn`

**Severity:** `warn`

When a function already uses errorset to model its failure cases, throwing a raw `new Error(...)` is inconsistent — callers have no way to introspect it via guards. Return an errorset kind value instead.

The rule detects functions that contain at least one errorset creation expression and flags any `throw new BuiltInError(...)` or `return new BuiltInError(...)` inside them. Throwing inside the target function of `X.capture` / `X.captureAsync` / `captureSync` / `captureAsync` is exempt.

**Options**

```json5
// Allow specific built-in subtypes (e.g. invariant assertions)
{ "allowedBuiltins": ["TypeError"] }
```

**❌ Incorrect**

```ts
function getUser(id: string) {
  if (!id) throw new Error("id is required") // ❌
  return UserError.not_found`User ${id} not found`({ id })
}
```

**✅ Correct**

```ts
function getUser(id: string) {
  if (!id) return UserError.invalid`id is required`
  return UserError.not_found`User ${id} not found`({ id })
}
```

> **Note:** `throw new Error(...)` inside the first argument of `.capture()` or `.captureAsync()` is exempt — that is the intended pattern for wrapping throwing third-party code.

---

### `prefer-guard-over-manual-kind-check` 💡

**Severity:** `warn`

Inside a guard block (after `isErr(result)` or `UserError(result)` has matched), prefer the typed kind-level guard `UserError.not_found(result)` over a manual `.kind === "not_found"` string comparison. The guard is refactor-safe and provides better type narrowing.

This rule provides **inline suggestions** (not auto-fixes) to replace the comparison with the guard of the set that narrowed the value: after `UserError(result)` (or `UserError.suspended(result)`) it suggests `UserError.<kind>(result)`, even when other sets are in scope. After `isErr(result)` the set is unknown, so the check is reported without a suggestion. The same narrowing forms as `no-unguarded-data-access` apply (`if`, guard clauses, ternaries, `&&`, `||`).

**❌ Incorrect**

```ts
if (isErr(result)) {
  if (result.kind === "not_found") { ... }  // ❌ (no suggestion: isErr doesn't say which set)
}

if (UserError(result)) {
  if (result.kind === "suspended") { ... }  // ❌ → suggest UserError.suspended(result)
}
```

**✅ Correct**

```ts
if (isErr(result)) {
  if (UserError.not_found(result)) { ... }
}

if (UserError(result)) {
  if (UserError.suspended(result)) { ... }
}
```

---

### `no-unguarded-data-access`

**Severity:** `warn`

Accessing errorset result properties (`.data`, `.kind`, `.message`, `.cause`) outside a guard block is unsafe — the value may be a success result, so these properties may not exist.

The rule tracks variables that are passed to an errorset guard (`UserError(r)`, `UserError.not_found(r)` or `isErr(r)`) anywhere in the file, resolved through scope analysis (a same-named variable in another function is a different variable), and flags property accesses on them that aren't narrowed. An access before the first guard call counts too. These forms narrow:

| Form | Narrowed access |
|---|---|
| `if (G(r)) { … }` | inside the `if` block |
| `if (!G(r)) { … } else { … }` | inside the `else` block |
| `if (!G(r)) return;` (or `throw`, `continue`, `break`) | every later statement in the same block |
| `G(r) ? r.data : …` / `!G(r) ? … : r.data` | the guarded branch |
| `G(r) && r.data` | the right-hand side (also inside larger `&&` chains) |
| `!G(r) \|\| r.data` | the right-hand side |

Narrowing carries into callbacks written inside the narrowed region.

**❌ Incorrect**

```ts
const result = getUser(id)
if (UserError(result)) { console.log("handled") }
console.log(result.data)   // ❌ — outside the guard block
```

```ts
const result = getUser(id)
if (isErr(result)) { handleError(result) }
console.log(result.kind)   // ❌ — outside the guard block
```

**✅ Correct**

```ts
const result = getUser(id)
if (UserError(result)) {
  console.log(result.data)  // ✅ — inside the guard block
}

if (UserError.not_found(result)) {
  console.log(result.message)  // ✅
}

function getId(r: User | UserError) {
  if (!UserError(r)) return r.id  // guard clause
  return r.data.id                // ✅ — r is a UserError here
}

const label = UserError(result) ? result.data.id : "ok"  // ✅
```

---

## Rule Summary

| Rule | Default | Fixable | Description |
|---|---|---|---|
| `no-throw-errorset` | error | 💡 suggestion | `throw` with an errorset value → `return` (suggested only where safe) |
| `no-catch-errorset` | error | — | Errorset guards inside `catch` blocks |
| `no-new-error-in-errorset-fn` | warn | — | `throw new Error()` / `return new Error()` in errorset functions |
| `prefer-guard-over-manual-kind-check` | warn | 💡 suggestion | `.kind ===` string check inside guard block |
| `no-unguarded-data-access` | warn | — | `.data/.kind/.message/.cause` outside a guard |

## License

MIT
