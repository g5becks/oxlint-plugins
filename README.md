# oxlint-plugins

Lint rules for [oxlint](https://oxc.rs/docs/guide/usage/linter.html), written for its
[JS plugin API](https://oxc.rs/docs/guide/usage/linter/plugins) and also usable with ESLint flat
config. Six independently versioned packages: ports of established ESLint plugins plus rules for
[`@takinprofit/errorset`](https://www.npmjs.com/package/@takinprofit/errorset).

## Packages

| Package | Rule prefix | Rules | What it checks | Ported from |
|---|---|---|---|---|
| [`oxlint-plugin-errorset`](packages/errorset) | `errorset/` | 5 | Correct use of `@takinprofit/errorset`: no thrown or caught error-set values, guarded `.data` access | (original) |
| [`oxlint-plugin-immutable`](packages/immutable) | `immutable/` | 8 | No `let`, no mutation, readonly types (syntactic, no type information) | `eslint-plugin-functional` 10.0.1 |
| [`oxlint-plugin-ts-no-assert`](packages/ts-no-assert) | `ts-no-assert/` | 1 | No type assertions (`as`, `<T>`, `!`) | `eslint-plugin-no-type-assertion` |
| [`oxlint-plugin-query`](packages/query) | `query/` | 6 | TanStack Query: exhaustive query keys, stable `QueryClient`, property order | `@tanstack/eslint-plugin-query` 5.91.4 |
| [`oxlint-plugin-router`](packages/router) | `router/` | 2 | TanStack Router: route property order, valid param names | `@tanstack/eslint-plugin-router` (+ one original rule) |
| [`oxlint-plugin-solidjs`](packages/solidjs) | `solidjs/` | 20 | SolidJS reactivity, JSX and API usage | `eslint-plugin-solid` 0.14.5 |

Each package README lists its rules, options, settings and recommended severities. Differences
from the upstream plugins are documented in [PARITY.md](PARITY.md); the upstream test suites run
against the ports in CI.

## Compatibility

| | Supported | Tested |
|---|---|---|
| oxlint | `>= 1.70.0 < 2` | 1.70.0 (floor) and the pinned version, 1.93.0; the latest release as an advisory check |
| ESLint (optional) | `>= 9` | 9.39.5 and 10.14.0 |
| Node.js | `^20.19.0 \|\| >= 22.12.0` | 22 and 24 (oxlint's own requirement) |

oxlint's JS plugin API is alpha and outside oxlint's semver, so versions outside the tested range
may break. Before 1.70, oxlint used a different rule-name scheme; see Migration.

## Configuration

### oxlint

Install the package next to oxlint, add its bundle to `jsPlugins` and enable rules by their short
names:

```jsonc
// .oxlintrc.json
{
  "jsPlugins": ["./node_modules/oxlint-plugin-solidjs/dist/index.js"],
  "rules": {
    "solidjs/reactivity": "warn",
    "solidjs/no-destructure": "error"
  }
}
```

Suppression comments use the same short names:

```ts
// oxlint-disable-next-line solidjs/reactivity
```

On oxlint >= 1.70 the long form (`oxlint-plugin-solidjs/reactivity`) still works as a config key,
but disable comments that use it are ignored. Diagnostics print as `solidjs(reactivity)`.

### ESLint flat config

Every package also works in ESLint (>= 9) through the bundled `eslintCompatPlugin` wrapper, and
exports a `recommended` preset:

```js
// eslint.config.mjs
import solid from "oxlint-plugin-solidjs/dist/index.js";

export default [
  {
    plugins: { solidjs: solid },
    rules: solid.configs.recommended.rules,
  },
];
```

## Migration

- **0.1 → 0.2** (oxlint >= 1.70 rule names, Node and peer ranges):
  [docs/migration-0.2.md](docs/migration-0.2.md), with a codemod (`scripts/migrate-0.2.ts`) that
  renames suppression comments and config keys.
- **0.2 → 0.3**: two changes may need action. `immutable/prefer-immutable-types` now validates its
  options, so upstream-only values such as `enforcement: "Immutable"` stop the run with "Options
  validation failed" (use `"ReadonlyShallow"`, or `"None"` to keep a category off).
  `query/stable-query-client` no longer autofixes files that import neither `useState` nor `React`
  from `react`; it offers a suggestion instead. Each package's `CHANGELOG.md` lists every change.

## Contributing

Bun workspace; the toolchain is pinned. Start with [CONTRIBUTING.md](CONTRIBUTING.md) (commands,
test layout, profiling, CI, changesets and releases) and [AGENTS.md](AGENTS.md).

```sh
bun install --frozen-lockfile
bun run gate                 # lint, format, type check, build, then the unit (with upstream), compat, repo, CLI and bench suites
bash scripts/ci-local.sh     # the CI matrix (oxlint floor/pinned/latest, ESLint 9/10, pack) in Docker
```

## License

MIT. See [LICENSE](LICENSE) and each package's `LICENSE`.
