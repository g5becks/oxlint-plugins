---
id: TASK-007
title: >-
  Release: Tags, changesets, changelogs, package metadata and release tooling
  (OX-06)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T17:57:00Z'
labels:
  - release
  - docs
milestone: m-0
dependencies:
  - TASK-006
documentation:
  - oxlint-plugins-audit.md
priority: high
type: chore
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit H3, H5 and H14. The published bundles differ from builds of the repo; there are no tags or changelogs; every package.json points at `https://github.com/takinprofit/biome-plugins`; AGENTS.md only describes Clavix.

## Implementation
1. **Retroactive tags** in Changesets format (`<package>@<version>`) for every published version (`npm view <pkg> versions` for all six; current: errorset 0.1.1, immutable 0.1.1, ts-no-assert 0.1.2, query 0.1.1, router 0.1.1, solidjs 0.1.1). Tag the commit that set each version. Compare each npm tarball with a build of that commit and record the diff summary (H3) in the tag message and the notes. Tags stay local until the hand-off rules allow pushing them.
2. **Changesets:** `@changesets/cli` as an exact devDependency (3.0.3 on 2026-11-11); `.changeset/config.json` with independent versions, `baseBranch: main`, `access: public`, no automatic commits. Each package gets a `CHANGELOG.md` backfilled with its 0.1.x history (from git and npm).
3. **Metadata** in all six package.json files: `repository` (`git+https://github.com/g5becks/oxlint-plugins.git` with `directory`), `homepage`, `bugs`, `license`; `files` includes `CHANGELOG.md`; `exports` adds `"./package.json"`.
4. **`scripts/release-prepare.ts`** (`--dry-run` supported): on a release branch it runs `changeset version`, updates the lockfile, runs the full gate and `scripts/ci-local.sh` on the release commit, builds, and packs each released package into `/Users/takinprofit/Dev/oxlint-plugins-release/<release>/`. It writes `SHA512SUMS` and `RELEASE_NOTES.md` (per-package sections from the changelogs), creates local tags, and prints the exact maintainer commands (`npm publish <tgz> --access public` per package and `gh release create` per tag). It never publishes or pushes.
5. **`.github/workflows/release.yml`:** on a tag push matching `oxlint-plugin-*@*`, publish that package with npm trusted publishing and provenance; skip versions already on npm. It can't run while Actions is locked; validate with actionlint.
6. **CONTRIBUTING.md and AGENTS.md:** setup (Bun 1.4.4, Node >= 22.18), commands, test layout, the task workflow (`scripts/backlog`), the release procedure, and the rule that only the maintainer publishes. Keep the Clavix block if wanted; point CLAUDE.md at AGENTS.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Local annotated tags exist for every published version; each records how the npm tarball compares with a build of that commit
- [x] #2 Changesets is configured for independent versions; every package has a CHANGELOG.md with its 0.1.x history
- [x] #3 All six package.json files have correct repository (with directory), homepage, bugs and license fields
- [x] #4 release-prepare --dry-run writes tarballs, SHA512SUMS, RELEASE_NOTES.md and the publish commands to a temp directory without pushing, tagging remotely or publishing
- [x] #5 release.yml passes actionlint; CONTRIBUTING.md and AGENTS.md document setup, tests, tasks and releases
- [x] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Retroactive local annotated tags for every published version that a commit set (H3 comparison in each message); pre-history versions untagged (maintainer decision).
2. Changesets 3.0.3: independent versions, baseBranch main, access public, commit false; backfilled CHANGELOG.md per package; changesets for this task's metadata and TASK-001's compat layer upgrade.
3. package.json metadata (repository+directory, homepage, bugs, license, files incl. CHANGELOG/LICENSE, exports ./package.json); MIT LICENSE files.
4. scripts/release-prepare.ts (+ --dry-run), root gate script, pack-smoke subset mode.
5. release.yml (tag -> trusted publishing, skip published), actionlint.
6. CONTRIBUTING.md, AGENTS.md, CLAUDE.md pointer; Colima requirement moved to CONTRIBUTING.
7. Dry run + ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- Retroactive LOCAL annotated tags (never pushed), each message recording how the npm tarball compares with a `bun build` (Bun 1.4.4, that commit's lockfile) of the tagged commit:
  - oxlint-plugin-errorset@0.1.0 -> d4bcb7a
  - oxlint-plugin-errorset@0.1.1 -> f1287ad
  - oxlint-plugin-immutable@0.1.1 -> d4bcb7a
  - oxlint-plugin-query@0.1.1 -> d4bcb7a
  - oxlint-plugin-router@0.1.1 -> d4bcb7a
  - oxlint-plugin-solidjs@0.1.1 -> d4bcb7a
  - oxlint-plugin-ts-no-assert@0.1.2 -> d4bcb7a
  errorset 0.1.0/0.1.1 and ts-no-assert 0.1.2: only bundler identifier renaming in the bundled compat layer (no rule code difference). immutable (-479 B), query (+1111 B), router (+78 B), solidjs (+338 B): the repo already held unreleased code changes (audit H3). Comparison artifacts: oxlint-plugins-release/logs/task-007-h3/.
- Not tagged (maintainer decision): query 0.1.0 (2026-02-21T22:52:44Z), router 0.1.0 (2026-02-21T22:52:42Z), ts-no-assert 0.1.1 (2026-02-21T23:56:09Z) were published before the repository's first commit; each CHANGELOG lists them as "published before this repository's history; not tagged" with the npm publish time.
- Changesets: @changesets/cli 3.0.3 (exact); .changeset/config.json: independent versions (fixed/linked empty), baseBranch main, access public, commit false, private root not versioned, format false (Biome formats). .changeset/README.md explains usage. Backfilled packages/*/CHANGELOG.md with 0.1.x history from git + npm (diffs of consecutive published tarballs: query/router 0.1.0->0.1.1 identical bundles; ts-no-assert 0.1.2 = oxlint `as const` shape; errorset 0.1.1 = README).
- Changesets added (patch, all six): package-metadata.md, bundled-compat-layer.md (TASK-001's @oxlint/plugins 1.43 -> 1.93 bundled layer).
- package.json x6: repository {git+https://github.com/g5becks/oxlint-plugins.git, directory packages/<name>}, homepage .../tree/main/packages/<name>#readme, bugs .../issues, license MIT, files [dist, README.md, CHANGELOG.md, LICENSE], exports adds "./package.json". MIT LICENSE added at the root and in each package (holder "Takin Profit", the git author; there was no LICENSE file despite "license": "MIT").
- scripts/release-prepare.ts <release> [--dry-run] [--out] [--skip-ci]: changeset version, lockfile update + frozen check, `bun run gate` (new root script), release commit, local tags, ci-local on the release commit (must PASS, log saved), build + pack released packages, pack-smoke on oxlint 1.70.0 + pinned, SHA512SUMS, RELEASE_NOTES.md, per-tag NOTES-*.md, MAINTAINER_COMMANDS.md; prints the commands. Never pushes or publishes. pack-smoke now verifies only the tarballs present when given --tarballs (a release may be a subset) and requires CHANGELOG.md + LICENSE in tarballs.
- .github/workflows/release.yml: on tag `oxlint-plugin-*@*`: checks tag == package.json name@version, skips versions already on npm, frozen install, `bun run gate`, `npm publish --provenance --access public` with `id-token: write` (trusted publishing). SHA-pinned actions.
- CONTRIBUTING.md (setup, commands, test layout, hooks/commits, CI + ci-local + the Colima overcommit requirement moved here from the ci-local.sh header, tasks, changesets, release procedure, only-the-maintainer-publishes); AGENTS.md gains an agent guide above the Clavix block; CLAUDE.md points at AGENTS.md/CONTRIBUTING.md.
- Follow-up created: TASK-036 (upstream copyright notices for ported MIT code), m-2, depends on task-007.

## Verification
- `git tag` -> 7 local tags as above; `git ls-remote --tags origin` not touched (no push).
- actionlint 1.7.12 on ci.yml + release.yml: exit 0.
- `bun run gate` exit 0 (unit 129/0, compat 19/0, repo 14/0, CLI 120/0, bench 4/0); `bun run test:pack` PASS (contents incl. CHANGELOG/LICENSE; 6 plugins on oxlint 1.93.0).
- `bun scripts/release-prepare.ts 0.2.0 --dry-run` (log: oxlint-plugins-release/logs/release-dry-run-51a8ceb.log): exit 0; temp worktree; versions errorset/immutable/query/router/solidjs 0.1.1->0.1.2, ts-no-assert 0.1.2->0.1.3 (only patch changesets so far); gate passed in the worktree; "would tag" six tags; ci-local skipped (dry run); six tarballs + SHA512SUMS (`shasum -a 512 -c` all OK) + RELEASE_NOTES.md + NOTES-*.md + MAINTAINER_COMMANDS.md (marked DRY RUN) in a temp dir; pack-smoke PASS for all six on 1.70.0 and 1.93.0. Afterwards the real repo still had 7 tags, HEAD 51a8ceb, no extra worktree, clean tree.
- Verified with scripts/ci-local.sh (51a8ceb, PASS); GitHub Actions unavailable (billing lock). All 10 legs pass (incl. advisory latest).

## Decisions
- No tags for pre-history versions (maintainer). LICENSE holder = git author name. Changesets `format: false` to avoid a second formatter. Dry run cannot run ci-local (its commit is unreachable for a clone).

Consumer-visible change: yes (metadata, LICENSE/CHANGELOG in tarballs, exports ./package.json) - covered by changesets.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Release hygiene: 7 local retroactive tags with H3 comparisons (3 pre-history versions documented, untagged), Changesets with backfilled CHANGELOGs, corrected metadata + MIT LICENSE, release-prepare.ts (dry run verified), release.yml (actionlint clean), CONTRIBUTING.md/AGENTS.md. Verified with scripts/ci-local.sh (51a8ceb, PASS).
<!-- SECTION:FINAL_SUMMARY:END -->
