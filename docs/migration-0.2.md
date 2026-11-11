# Migrating to 0.2

Version 0.2 of the six packages (`oxlint-plugin-errorset`, `-immutable`, `-ts-no-assert`, `-query`,
`-router`, `-solidjs`) follows oxlint 1.70's rename of JS-plugin rules. **Upgrade oxlint, the
plugins, your config keys and your disable comments in one commit**: no rule spelling works on
both sides of oxlint 1.70.

## Breaking changes

| Change | Packages | What to do |
|---|---|---|
| oxlint `>= 1.70.0 < 2` is required (peer dependency); ESLint `>= 9` is an optional peer | all | Upgrade oxlint to 1.70 or later in the same commit as the renames below |
| Node.js `^20.19.0 \|\| >= 22.12.0` (oxlint's own requirement; was `>= 18`) | all | Upgrade Node.js if needed |
| Rule names are `<name>/<rule>` (`immutable/no-let`), not `oxlint-plugin-<name>/<rule>`. Long-form **disable comments are ignored** on oxlint >= 1.70; the short form doesn't exist before 1.70 | all (oxlint behavior) | Run the codemod below |
| `recommended` preset keys use the normalized prefix: `immutable/` (was `functional/`), `ts-no-assert/` (was `no-type-assertion/`), `solidjs/` (was `solid/`) | immutable, ts-no-assert, solidjs | ESLint: register the plugin under its normalized name (below) |
| `no-throw-errorset` has no autofix; it offers a suggestion, and only where `return` keeps control flow (not inside callbacks, loops, `switch` or `try`/`catch`/`finally`) | errorset | Apply the suggestion in your editor, or restructure by hand; `oxlint --fix` no longer rewrites throws |
| The errorset rules report more: error sets re-exported from your own modules (opt-in via `settings.errorset.modules`), accesses before the first guard (`no-unguarded-data-access`), `return new Error(...)` in errorset functions (`no-new-error-in-errorset-fn`), errorset 0.4/0.5 patterns (`.with()`, merged guards) | errorset | Triage new reports (run at `warn` first if needed) |
| Context getter fallbacks for oxlint < 1.52 were removed | all | Nothing (covered by the oxlint >= 1.70 requirement) |

Fixed false positives you may see disappear: `jsx-no-undef` reported files that didn't miss an
import, depending on lint order, and `--fix` inserted imports into them; `reactivity` could report a
file because of another file's Solid imports; `no-unguarded-data-access` now understands guard
clauses, ternaries, `&&`/`||` and `else`; `no-catch-errorset` only checks the caught value;
`prefer-guard-over-manual-kind-check` suggests the narrowing guard's set. See each package's
`CHANGELOG.md` for details.

## Codemod

`scripts/migrate-0.2.ts` rewrites the plugin prefix in disable comments (`oxlint-disable*`,
`eslint-disable*`, `-enable`, line and block comments, several rules per comment) and in rule keys
of `.oxlintrc.json` / `.oxlintrc.jsonc` files. It never touches `jsPlugins` entries or package
paths, maps the pre-publish names `oxlint-plugin-functional/` and `oxlint-plugin-solid/`, and is
idempotent. It needs Node.js >= 22.18 (or Bun) and nothing else:

```bash
curl -fsSLO https://raw.githubusercontent.com/g5becks/oxlint-plugins/main/scripts/migrate-0.2.ts
node migrate-0.2.ts --dry-run .   # what would change
node migrate-0.2.ts .             # rewrite (skips node_modules, .git, dist, build, coverage)
node migrate-0.2.ts --check .     # exit 1 while anything is left to migrate (for CI)
```

Then, in the same commit, bump oxlint to `>= 1.70` and the plugins to `^0.2.0`, and run your lint
with `--deny-warnings` to confirm nothing is left. Rules of third-party plugins are not touched.

### ESLint flat config

Register each plugin under its normalized name so the preset keys resolve:

```js
import immutable from "oxlint-plugin-immutable";
import solidjs from "oxlint-plugin-solidjs";
import tsNoAssert from "oxlint-plugin-ts-no-assert";

export default [
  {
    plugins: { immutable, solidjs, "ts-no-assert": tsNoAssert },
    rules: {
      ...immutable.configs.recommended.rules,
      ...solidjs.configs.recommended.rules,
      ...tsNoAssert.configs.recommended.rules,
    },
  },
];
```

Rename the same prefixes in any rule overrides and `eslint-disable` comments (the codemod handles
the comments).

### errorset: sets re-exported from your own modules

If your error sets live in a shared module (`import { UserError } from "@acme/core"`), list it so
the rules recognize them (see the errorset README):

```json
{ "settings": { "errorset": { "modules": ["@acme/core"] } } }
```

## agentx checklist (for the agentx migration epic; not executed here)

Validated on a temporary copy of agentx (2026-11-11, commit `2add2ef`): the codemod rewrote
**170 suppressions in 92 files** (audit: 168 in 90; agentx has grown since) and **53 config keys** in
`.oxlintrc.json`, `client/.oxlintrc.json` and `server/.oxlintrc.json`, leaving every `jsPlugins` entry
alone; a second run and `--check` found nothing left. In **one commit**:

1. Bump the six `oxlint-plugin-*` dependencies to the 0.2.0 releases.
2. Run `node migrate-0.2.ts .` at the repo root (suppressions and the three config files).
3. Bump `oxlint` from `1.69.0` to the pinned version (1.93.0 at the time of writing) and update the
   `mise.toml` comment that explains the 1.69 pin.
4. Add `"settings": { "errorset": { "modules": ["@agentx/core"] } }` to the configs that enable errorset rules.
5. Remove the stale `// eslint-disable-next-line functional/...` comment in
   `client/src/components/ui/button.tsx`.
6. Run every lint task with `--deny-warnings`.

Then (audit OX-42): the errorset rules will report in agentx for the first time. Run them at `warn`
for one cycle, triage each report as fix, justify (suppress with a reason) or rule bug, and only then
switch them to `error`.
