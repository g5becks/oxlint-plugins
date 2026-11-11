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

- Oxlint `>= 1.0.0` (requires `jsPlugins` support)
- Node.js `>= 18`

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
    "oxlint-plugin-errorset/no-throw-errorset": "error",
    "oxlint-plugin-errorset/no-catch-errorset": "error",
    "oxlint-plugin-errorset/no-new-error-in-errorset-fn": "warn",
    "oxlint-plugin-errorset/prefer-guard-over-manual-kind-check": "warn",
    "oxlint-plugin-errorset/no-unguarded-data-access": "warn"
  }
}
```

Or use the bundled `recommended` config which enables all rules at their default severities:

```json
{
  "jsPlugins": ["./node_modules/oxlint-plugin-errorset/dist/index.js"],
  "rules": {
    "oxlint-plugin-errorset/no-throw-errorset": "error",
    "oxlint-plugin-errorset/no-catch-errorset": "error",
    "oxlint-plugin-errorset/no-new-error-in-errorset-fn": "warn",
    "oxlint-plugin-errorset/prefer-guard-over-manual-kind-check": "warn",
    "oxlint-plugin-errorset/no-unguarded-data-access": "warn"
  }
}
```

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

Errorset values are returned by functions — they are never thrown, so they can never arrive in a `catch` clause. Using errorset guards (`isErr`, a set-level guard, or `instanceof`) inside `catch` will silently never match.

Also flags `.kind` access on the catch parameter, since `e.kind` implies the thrown error is an errorset — which is impossible.

> **Note:** Errorset guards used inside a nested function _within_ a catch block are exempted (they likely refer to a different value, not the catch parameter).

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

The rule detects functions that contain at least one errorset creation expression and flags any `throw new BuiltInError(...)` inside them.

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

This rule provides **inline suggestions** (not auto-fixes) to replace the comparison with the appropriate guard call.

**❌ Incorrect**

```ts
if (isErr(result)) {
  if (result.kind === "not_found") { ... }  // ❌ → suggest UserError.not_found(result)
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
| `no-new-error-in-errorset-fn` | warn | — | `throw new Error()` in errorset functions |
| `prefer-guard-over-manual-kind-check` | warn | 💡 suggestion | `.kind ===` string check inside guard block |
| `no-unguarded-data-access` | warn | — | `.data/.kind/.message/.cause` outside a guard |

## License

MIT
