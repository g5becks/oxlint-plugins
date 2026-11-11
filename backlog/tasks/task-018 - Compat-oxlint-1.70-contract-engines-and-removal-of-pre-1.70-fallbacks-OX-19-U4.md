---
id: TASK-018
title: >-
  Compat: oxlint >= 1.70 contract, engines, and removal of pre-1.70 fallbacks
  (OX-19, U4)
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - compat
  - docs
milestone: m-1
dependencies:
  - TASK-017
documentation:
  - oxlint-plugins-audit.md
priority: high
type: chore
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit U4, U3, P4, H7 and H8. No package declares `peerDependencies`; every README claims "Oxlint >= 1.0.0" (false: JS plugins reached alpha at 1.55, `jsx-uses-vars` crashes before 1.56, suppression semantics flipped at 1.70); `engines.node` is `>=18.0.0` while oxlint needs `^20.19.0 || >=22.12.0`. Pre-1.52 `context` getter fallbacks remain in shipped code (`plugin-solid/src/upstream/compat.ts:17-52`, `plugin-solid/src/utils/trace.ts:8-9`, `plugin-query/src/utils/ast-utils.ts:202-203`; paths are pre-rename).

## Implementation
1. All six packages: `peerDependencies: { "oxlint": ">=1.70.0 <2", "eslint": ">=9" }` with `eslint` optional in `peerDependenciesMeta`; `engines.node: "^20.19.0 || >=22.12.0"`.
2. Remove the `getSourceCode`/`getScope`/`markVariableAsUsed` fallbacks, after confirming ESLint 9 and 10 provide `context.sourceCode`, `sourceCode.getScope` and `sourceCode.markVariableAsUsed`.
3. READMEs: tested range (`>= 1.70.0 < 2`), short-name config keys and disable comments, and a corrected `jsx-uses-vars` note (works since 1.56; whether to recommend it is decided in Phase 2).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All six package.json files declare oxlint >=1.70.0 <2 and optional eslint >=9 peers and engines.node ^20.19.0 || >=22.12.0
- [ ] #2 No context getter fallback code remains (grep), and unit, CLI and ESLint-compat suites pass on oxlint 1.70.0 and the pinned version
- [ ] #3 READMEs state the tested range, short-name usage for config keys and disable comments, and the corrected jsx-uses-vars note
- [ ] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
