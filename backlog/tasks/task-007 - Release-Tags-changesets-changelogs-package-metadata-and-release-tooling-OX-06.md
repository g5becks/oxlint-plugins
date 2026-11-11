---
id: TASK-007
title: >-
  Release: Tags, changesets, changelogs, package metadata and release tooling
  (OX-06)
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 Local annotated tags exist for every published version; each records how the npm tarball compares with a build of that commit
- [ ] #2 Changesets is configured for independent versions; every package has a CHANGELOG.md with its 0.1.x history
- [ ] #3 All six package.json files have correct repository (with directory), homepage, bugs and license fields
- [ ] #4 release-prepare --dry-run writes tarballs, SHA512SUMS, RELEASE_NOTES.md and the publish commands to a temp directory without pushing, tagging remotely or publishing
- [ ] #5 release.yml passes actionlint; CONTRIBUTING.md and AGENTS.md document setup, tests, tasks and releases
- [ ] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
