# Agent guide: oxlint-plugins

Read **CONTRIBUTING.md** first: setup (Bun 1.4.4, Node >= 22.18), commands, test layout, CI
(`scripts/ci-local.sh` and its Colima requirement), changesets and the release procedure.

Rules for agents working in this repo:

- Source of truth for planned work: `oxlint-plugins-audit.md` (finding IDs) and the Backlog.md
  tasks in `backlog/`, managed **only** through `scripts/backlog` (never edit `backlog/` by hand).
  Commit task-file changes with the code they describe.
- Quality gate before every commit: `bun install --frozen-lockfile`, `bun run gate`
  (lint, format, typecheck on TS 7, build, unit, compat, repo, CLI, bench); after CI changes or
  before a release, `bash scripts/ci-local.sh HEAD` must print `RESULT: PASS`.
- Bug fixes start with a failing test (the audit's Appendix A probe). Never weaken or skip tests;
  `test.failing` markers must name the task that removes them.
- Use the pinned `node_modules/.bin/oxlint` (or `OXLINT_BIN`), never `bunx oxlint`.
- Every consumer-visible change gets a changeset per affected package.
- Conventional Commits (`<type>(<scope>)!: <summary> (TASK-0NN)`); never `--no-verify`, never `git stash`.
- **Only the maintainer publishes.** Never run `npm publish`, `npm login` or create GitHub
  releases; never push tags (a tag push triggers `release.yml`).

<!-- CLAVIX:START -->
# Clavix - Prompt Improvement Assistant

Clavix is installed in this project. Use the following slash commands:

- `/clavix:improve [prompt]` - Optimize prompts with smart depth auto-selection
- `/clavix:prd` - Generate a PRD through guided questions
- `/clavix:start` - Start conversational mode for iterative refinement
- `/clavix:summarize` - Extract optimized prompt from conversation

**When to use:**
- **Standard depth**: Quick cleanup for simple, clear prompts
- **Comprehensive depth**: Thorough analysis for complex requirements
- **PRD mode**: Strategic planning with architecture and business impact

Clavix automatically selects the appropriate depth based on your prompt quality.

For more information, run `clavix --help` in your terminal.
<!-- CLAVIX:END -->
