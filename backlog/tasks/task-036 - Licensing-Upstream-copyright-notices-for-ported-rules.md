---
id: TASK-036
title: 'Licensing: Upstream copyright notices for ported rules'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-11T17:52:00Z'
updated_date: '2026-11-12T14:40:00Z'
labels:
  - licensing
milestone: m-2
dependencies:
  - TASK-007
priority: medium
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Found in TASK-007. The plugins are ports of MIT-licensed upstream projects (eslint-plugin-solid, eslint-plugin-functional, @tanstack/eslint-plugin-query and -router, eslint-plugin-no-type-assertion). MIT requires keeping the upstream copyright and permission notice in copies or substantial portions; the published tarballs only carry this repo's LICENSE (added in TASK-007).

## Implementation
Add a THIRD_PARTY_NOTICES (or a section in each package LICENSE) with each upstream's copyright line and license text for the code it ports, include it in `files`, and check it in pack-smoke.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each package tarball contains the copyright notice and license of every upstream project it ports
- [x] #2 pack-smoke verifies the notice file is present
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Per package that ports upstream code, THIRD_PARTY_NOTICES.md with each upstream project (name, version ported, repository) and its full copyright + MIT license text: immutable <- eslint-plugin-functional 10.0.1; ts-no-assert <- eslint-plugin-no-type-assertion (npm 1.3.0 LICENSE); query <- @tanstack/eslint-plugin-query 5.91.4 (vendored LICENSE); router <- @tanstack/eslint-plugin-router; solidjs <- eslint-plugin-solid 0.14.5 (vendored LICENSE). errorset ports nothing.
2. Add the file to package.json files; pack-smoke checks it is in each tarball and contains each upstream copyright line.
3. Changeset (patch, 5 packages); gate; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- scripts/third-party-notices.ts: generates packages/<p>/THIRD_PARTY_NOTICES.md from the upstream LICENSE files (heading per upstream, repository, what was ported, full license text); `--check` mode. Upstreams:
  - immutable <- eslint-plugin-functional (ported from 10.0.1): node_modules/eslint-plugin-functional/LICENSE, "Copyright (c) 2016 Jonas Kello".
  - ts-no-assert <- eslint-plugin-no-type-assertion: vendor/licenses/eslint-plugin-no-type-assertion@1.3.0/LICENSE (from `npm pack eslint-plugin-no-type-assertion@1.3.0`, tarball sha256 b94c6e55adeb2ecd1cb509cb9b58c72ca4ccf4caa1c2c38744266d4c3fc9d8d0; identical to the GitHub repo LICENSE), "Copyright (c) 2020 Kirill Korolyov".
  - query <- @tanstack/eslint-plugin-query 5.91.4: vendored LICENSE, "Copyright (c) 2021-present Tanner Linsley".
  - router <- @tanstack/eslint-plugin-router (create-route-property-order; license text from 1.162.0 in node_modules; no recorded ported version), "Copyright (c) 2021-present Tanner Linsley".
  - solidjs <- eslint-plugin-solid 0.14.5: vendored LICENSE, "Copyright (c) 2021 Josh Wilson".
  - errorset: original rules, no upstream (asserted by a test).
- package.json `files` += THIRD_PARTY_NOTICES.md (5 packages); vendor/README.md documents vendor/licenses/.
- scripts/pack-smoke.ts: the notices file is required in each ported package's tarball and must contain every upstream copyright line (read from the tarball with tar -xOzf); allowed in the contents allowlist.
- tests/repo/third-party-notices.test.ts: committed files equal the generator output, contain the copyright lines, and are listed in `files`; only errorset lacks an upstream.

## Verification
- AC #1: `bun run test:pack` -> "ok contents" for all six packages (5 with notices + copyright lines checked in the tarball), plus the oxlint 1.93.0 consumer runs.
- AC #2: pack-smoke contents check above (also runs in ci-local's pack leg on 1.70.0 + 1.93.0).
- `bun run gate`: exit 0 (repo suite +2 tests).
- Changeset .changeset/third-party-notices.md (patch, 5 packages).
<!-- SECTION:NOTES:END -->
