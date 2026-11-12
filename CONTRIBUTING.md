# Contributing

Six oxlint JS plugins (`packages/<name>`), published independently to npm:
`oxlint-plugin-errorset`, `-immutable`, `-ts-no-assert`, `-query`, `-router`, `-solidjs`.
Directory names are the normalized plugin names (the rule prefix on oxlint >= 1.70);
`scripts/plugins.ts` is the single map of directory, npm name and prefix.

## Setup

- **Bun 1.4.4** (install, build, most test suites).
- **Node >= 22.18** (oxlint runs JS plugins on Node; oxlint's own `RuleTester` refuses Bun and
  needs Node type stripping). oxlint itself needs Node `^20.19.0 || >=22.12.0`.
- `bun install --frozen-lockfile`. This also installs the git hooks (lefthook, via `prepare`).

Every tool is pinned exactly in the root `package.json` (vendored upstream sources live in `vendor/`, the real-world lint corpus in `tests/fixtures/corpus/`): oxlint and `@oxlint/plugins` (same
version), TypeScript 5.9.3 for typescript-eslint plus TypeScript 7 (`typescript-7` alias) for
`bun run check`, Biome, lefthook, Changesets, Backlog.md. Never use `bunx oxlint`: tests use
`node_modules/.bin/oxlint`, or `OXLINT_BIN=<path>` to test another oxlint version.

## Commands

| Command | What it does |
|---|---|
| `bun run build` | Bundle each plugin to `packages/<name>/dist/index.js` (`bun scripts/build.ts [name...]`) |
| `bun run check` | `tsc -b` on TypeScript 7 (all packages, tests and scripts) |
| `bun run lint` / `bun run format` / `bun run format:check` | oxlint repo lint plus `scripts/check-createonce-state.ts` (closure state in `createOnce` must be reset in `before()`); Biome formatting |
| `bun run test:unit` | Unit tests per rule (`packages/*/tests`) in oxlint's `RuleTester` under `node --test`; `bun run test:unit:<name>` for one package |
| `bun run test:compat` / `bun run test:compat:eslint10` | ESLint compatibility and integration tests (`tests/integration`, `tests/eslint-compat`) on ESLint 9 / ESLint 10 (`ESLINT_PACKAGE=eslint-10`, an exact npm alias) |
| `bun run test:cli` | Real-oxlint suite: bundles each plugin into a temp dir and lints fixtures (`tests/cli`) |
| `bun run test:bench` | Bench smoke (exact counts asserted, timings only logged) |
| `bun run bench:profile` | Per-plugin and per-rule cost on `tests/fixtures/corpus` (see [Profiling](#profiling)) |
| `bun run test:repo` | Repo tooling tests (commit-msg check) |
| `bun run test:pack` | Pack every package, install into a temp consumer, lint with each plugin |
| `bun run parity` | Advisory parity report: upstream ESLint plugins (pinned devDependencies) vs the ports on `tests/fixtures/corpus`, per-rule recall/precision and site diff (`scripts/parity.ts --out <file>`) |
| `bun run gate` | Everything above except pack, in CI order |
| `bash scripts/ci-local.sh [ref]` | Local mirror of `.github/workflows/ci.yml` (see below) |

### Test layout

- **Unit tests** (`packages/<name>/tests/*.test.ts`) use oxlint's own `RuleTester`
  (`oxlint/plugins-dev`, via `tests/helpers/rule-tester.ts`) under `node --test`, loading the
  `.ts` sources through Node type stripping. That's why relative imports in `src/` carry `.ts`
  extensions. `OXLINT_RULE_TESTER=<oxlint>/dist/plugins-dev.js` runs them against another
  oxlint version's RuleTester (CI uses the 1.70.0 floor).
- **ESLint compatibility** (`tests/eslint-compat`, `bun test`) is the only place ESLint's
  `RuleTester`/`Linter` and typescript-eslint are used: every plugin in an ESLint 9 flat config.
- **State isolation**: oxlint's RuleTester calls `createOnce` once per case, so cross-file state
  leaks can't show up there. `tests/cli/helpers/state-isolation.ts` (`lintSequence`) lints a
  sequence of files with one rule instance in one oxlint process (`--threads 1`); use it for
  regression tests of per-file state.

- `tests/cli/fixtures/<plugin>/<rule>.ts(x)`: fixtures. New suites mark expected reports with a
  `// report` comment and compare against `markedLines()`.
- Known bugs that a later task fixes may be pinned with `test.failing("TASK-0NN: ...")`. The
  marker must name the fixing task, that task removes it, and none may remain at a release.

### Profiling

`bun run bench:profile` runs real oxlint single-threaded over `tests/fixtures/corpus/` (76 files)
for: no JS plugins (the baseline), each plugin with all its rules, and each rule alone. Each
measurement is one discarded warm-up run plus `--runs` runs (default 5, minimum 5); the median wall
time and its delta over the baseline are written to `tests/bench/results/profile-<platform>-<arch>.json`
(gitignored) with the machine and versions. Options: `--runs <n>`, `--plugins a,b`, `--out <file>`,
`--quick` (1 run, no warm-up; what `bun run test:bench` does for one plugin so the profiler keeps
working on the floor and pinned oxlint).

The committed baseline is `tests/bench/baseline/darwin-arm64.json` (Apple M5, oxlint 1.93.0,
9 runs). Compare against it on the same machine only; refresh it with
`bun run bench:profile --runs 9 --out tests/bench/baseline/<platform>-<arch>.json` when a change
is meant to move it, and say so in the commit.

How to read it: most of the delta is fixed. Loading any JS plugin adds about 53 ms on the corpus
(the per-rule deltas are 53-57 ms even for rules whose callbacks take under 1 ms), so compare rules
by `callbacksMs`, not by `deltaMs`.

**oxlint rule timings.** `oxlint --debug=timings` prints a per-rule table (time, calls, source
`js-plugin`) plus the JS plugin runtime split into rule callbacks and shared overhead, but:

- only with oxlint **1.93.0** (pinned) here. On the **1.70.0** floor the flag is accepted and
  prints nothing extra;
- only with the `default` output format. Pass `-f default` explicitly: in some environments (observed in an AI-agent shell)
  oxlint picks the `agent` format by default, and `-f agent`, `-f json` and `-f stylish` omit the
  table;
- shared work is charged to the rule that triggers it (scope analysis, for example, is
  probably charged to the first rule that asks for it), so per-rule callback times don't sum to
  separable costs.

```sh
node_modules/.bin/oxlint -c .oxlintrc.json --threads 1 -f default --debug=timings tests/fixtures/corpus
```

`bench:profile` records `callbacksMs` from this table when it's printed and `null` otherwise
(`method.timingsAvailable`).

## Git hooks and commits

- pre-commit formats (Biome) and lints (oxlint) staged files; pre-push runs `check` and unit tests.
- Commit messages follow Conventional Commits: `<type>(<scope>)!: <summary> (TASK-0NN)`,
  enforced by `scripts/check-commit-msg.ts`. Never bypass hooks with `--no-verify`.

## CI

GitHub Actions (`.github/workflows/ci.yml`): check, unit, cli on oxlint {1.70.0 floor, pinned,
latest}, eslint-compat and pack; plus a weekly run against `oxlint@latest` (JS plugins are outside
oxlint's semver). `latest` is advisory on push/PR and blocking on the schedule.

`scripts/ci-local.sh [ref]` runs the same legs on a clean clone: macOS on the host, Linux in
Docker (Colima) on Node 24 + Bun 1.4.4. It prints a results table and `RESULT: PASS|FAIL`; logs go
to `../oxlint-plugins-release/ci-local/<sha>/logs/`. Any change to ci.yml must be mirrored there.

**Colima requirement:** the VM must allow memory overcommit. oxlint's JS-plugin allocator pool
reserves a large block of address space per thread; with Linux heuristic overcommit
(`vm.overcommit_memory=0`) a 6 GiB VM without swap refuses it and oxlint aborts
(`oxc_allocator/src/pool/fixed_size.rs`, exit 134). Real memory use is small. Fix:

```bash
colima ssh -- sudo sysctl -w vm.overcommit_memory=1
```

and persist it in `~/.config/colima/default/colima.yaml`:

```yaml
provision:
  - mode: system
    script: sysctl -w vm.overcommit_memory=1
```

ci-local runs a preflight (a no-op JS plugin in the CI image) and stops with this message if
the VM isn't set up.

## Tasks

Work is tracked with Backlog.md in `backlog/`, only through `scripts/backlog` (pinned 1.55.3);
never edit `backlog/` files by hand. Typical loop:

```bash
scripts/backlog task list --plain -s "To Do"
scripts/backlog task view <id> --plain
scripts/backlog task edit <id> -s "In Progress" -a @me --plan $'1. ...'
scripts/backlog task edit <id> --append-notes $'...' --check-ac <n>
scripts/backlog task edit <id> --final-summary $'...' -s Done
```

Commit task-file changes together with the code they describe.

## Changesets and releases

Every consumer-visible change needs a changeset (`.changeset/*.md`) for each affected package;
breaking changes say so and include migration steps. Versions are independent per package.

Releases are prepared on a `release/<version>` branch:

```bash
bun scripts/release-prepare.ts <version> --dry-run   # rehearsal: temp worktree + temp output
bun scripts/release-prepare.ts <version>             # real run
```

The real run runs `changeset version`, the full gate, commits `chore(release): <version>`,
creates **local** annotated tags `<package>@<version>`, requires `scripts/ci-local.sh` to PASS on
the release commit, packs and verifies the tarballs (oxlint 1.70.0 and pinned), and writes
`SHA512SUMS`, `RELEASE_NOTES.md` and `MAINTAINER_COMMANDS.md` to
`../oxlint-plugins-release/<version>/`. It never pushes or publishes.

**Only the maintainer publishes.** The maintainer pushes the tags and publishes the tarballs
(commands in `MAINTAINER_COMMANDS.md`). Once GitHub Actions is available, a pushed tag triggers
`.github/workflows/release.yml`, which publishes that package with npm trusted publishing and
provenance and skips versions already on npm.

Versions published before this repository's history (query 0.1.0, router 0.1.0, ts-no-assert
0.1.1) have no tags; every other published version has a retroactive local tag.
