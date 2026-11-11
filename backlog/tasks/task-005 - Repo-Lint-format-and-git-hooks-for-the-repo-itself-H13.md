---
id: TASK-005
title: 'Repo: Lint, format and git hooks for the repo itself (H13)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T17:05:00Z'
labels:
  - toolchain
milestone: m-0
dependencies:
  - TASK-004
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit H13. The repo has no lint or format config of its own beyond a stale root `.oxlintrc.json`, and no git hooks.

## Implementation
1. Lint the repo with the pinned oxlint (`.oxlintrc.json` covering `packages/*/src`, `scripts/`, `tests/`; exclude vendored `upstream/` code and fixtures).
2. Formatter: use oxfmt if a stable release is on npm, otherwise Biome 2.x; pin it exactly and record the choice.
3. lefthook (exact devDependency, installed by `prepare`): pre-commit formats and lints staged files; pre-push runs typecheck and unit tests; commit-msg enforces Conventional Commits with a small script.
4. Do the one-time reformat in its own commit with no logic changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Repo lint reports 0 issues and the format check is clean
- [x] #2 lefthook pre-commit, pre-push and commit-msg hooks are installed by bun install and work (a bad commit message is rejected)
- [x] #3 The reformat commit contains formatting only (tests and bundles unchanged)
- [x] #4 Every check that was green when the task started is still green (frozen install, typecheck, unit, ESLint-compat, CLI and bench suites as they exist at the time); commands and results are recorded in the notes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Formatter: oxfmt is 0.78.0 (pre-1.0) -> Biome 2.6.6 exact, formatter only (oxlint lints).
2. One-time reformat in its own commit (formatting only; bundles compared ignoring whitespace; suites unchanged).
3. Root .oxlintrc.json: built-in correctness rules (typescript, unicorn, oxc, import) over packages/scripts/tests; ignore upstream/, fixtures, dist, client/, backlog/, .clavix/. Fix the findings.
4. lefthook 2.2.2 exact, `prepare: lefthook install`: pre-commit biome format (stage_fixed) + oxlint on staged files; pre-push check + unit; commit-msg scripts/check-commit-msg.ts (+ tests/repo test).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- Commit 2098cfb (formatting only): @biomejs/biome 2.6.6 (exact) + biome.json (2 spaces, width 120, double quotes, semicolons, trailing commas; linter/assist off; excludes **/fixtures, **/upstream, **/dist, client/, backlog/, .clavix/, .serena/, bun.lock, *.md) and the one-time reformat of 53 files.
- This commit: root .oxlintrc.json replaced (the old one only loaded our dist bundles with long-form keys): oxlint built-in `correctness` = error with typescript/unicorn/oxc/import plugins, ignore patterns as above. Three findings fixed: event-handlers `/^on/.test(name)` -> `name.startsWith("on")` (identical for identifier names); justified `oxlint-disable-next-line no-control-regex` on jsx-no-script-url's intentional control-character regex (same as upstream); unused `loaderIdx` removed from the router CLI test (it was never asserted).
- lefthook 2.2.2 (exact) + lefthook.yml; root `prepare: lefthook install` so `bun install` installs the hooks. pre-commit: biome format --write on staged files (stage_fixed) and `oxlint --deny-warnings --no-error-on-unmatched-pattern` (needed: oxlint exits 1 when every staged path is ignored, e.g. a fixtures-only commit); pre-push: `bun run check` + `bun run test:unit`; commit-msg: `bun scripts/check-commit-msg.ts {1}` (Conventional Commits header, types build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test, lowercase scope, optional `!`, <= 100 chars, blank line before body; git-generated Merge/Revert/fixup! messages allowed).
- New scripts: lint, format, format:check, test:repo (tests/repo/commit-msg.test.ts, 14 cases).

## Decisions
- Formatter: Biome 2.6.6, not oxfmt: oxfmt's latest is 0.78.0 (pre-1.0, weekly releases since), Biome 2.x is stable. Biome only formats; linting stays with oxlint.
- Repo lint does not dogfood our own plugins: they would have to be built first (jsPlugins load dist bundles) and the immutable/ts-no-assert style rules do not match this repo's code (rule implementations use `as any`/`let` extensively). Built-in correctness rules gate the repo.

## Verification
- Reformat commit: bundles before/after the reformat are byte-identical for errorset/immutable/ts-no-assert and identical ignoring whitespace for query/router/solidjs (bun keeps source line breaks inside array literals); unit 129/0, compat 19/0, CLI 120/0, bench 4/0, check exit 0 on the reformatted tree before committing.
- `bun run lint` exit 0 (0 issues); `bun run format:check` -> "Checked 142 files ... No fixes applied".
- Hooks: a clean copy of the tracked tree (`git init` + `bun install --frozen-lockfile`) gets .git/hooks/{commit-msg,pre-commit,pre-push}. `git commit --allow-empty -m "bad message"` -> rejected by conventional-commit (HEAD unchanged). `lefthook run pre-push` -> typecheck and unit pass; `lefthook run pre-commit` on staged changes -> format + lint pass. oxlint/biome on ignored paths only (fixture file) -> exit 0 with the flags above.
- Gate: frozen install no changes; check exit 0 (TS 7.0.2); unit 129/0; compat 19/0; repo 14/0; CLI 120/0 (pinned 1.93.0); bench 4/0; build ok.

Consumer-visible change: none.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Repo dogfoods oxlint (built-in correctness, 0 issues) and Biome 2.6.6 formatting (one formatting-only commit 2098cfb); lefthook installs pre-commit (format+lint staged), pre-push (check+unit) and a Conventional Commits commit-msg check from bun install.
<!-- SECTION:FINAL_SUMMARY:END -->
