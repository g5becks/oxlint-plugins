---
id: TASK-018
title: >-
  Compat: oxlint >= 1.70 contract, engines, and removal of pre-1.70 fallbacks
  (OX-19, U4)
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T21:03:00Z'
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
- [x] #1 All six package.json files declare oxlint >=1.70.0 <2 and optional eslint >=9 peers and engines.node ^20.19.0 || >=22.12.0
- [x] #2 No context getter fallback code remains (grep), and unit, CLI and ESLint-compat suites pass on oxlint 1.70.0 and the pinned version
- [x] #3 READMEs state the tested range, short-name usage for config keys and disable comments, and the corrected jsx-uses-vars note
- [x] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. package.json x6: peerDependencies oxlint >=1.70.0 <2, eslint >=9 (optional), engines.node ^20.19.0 || >=22.12.0.
2. Remove context getter fallbacks / optional chains in shipped src after confirming ESLint 9 and 10 provide sourceCode.getScope/getAncestors/markVariableAsUsed/scopeManager.
3. READMEs: tested range, rule-name/suppression section, jsx-uses-vars note. Changeset; suites on 1.70 and pinned.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Note from TASK-008 (2026-11-11): ts-no-assert's `as const` handling accepts TSTypeReference("const") and TSTypeOperator("const"). Mutation runs showed only the TSTypeReference branch is exercised, in oxlint's RuleTester on 1.47.0, 1.70.0 and 1.93.0 and in typescript-eslint. TASK-008 keeps both branches (its item 3); consider whether the TSTypeOperator branch is a dead fallback here.

## Outcome
- All six package.json: `peerDependencies: { oxlint: ">=1.70.0 <2", eslint: ">=9" }`, `peerDependenciesMeta: { eslint: { optional: true } }`, `engines.node: "^20.19.0 || >=22.12.0"`. bun.lock records the workspace peers (frozen install passes).
- Removed in shipped code: query utils/ast-utils.ts `context.sourceCode ?? context.getSourceCode()` and `sourceCode.getScope?.(node) ?? context.getScope?.()`, `sourceCode.getAncestors?.(node) ?? []`; solidjs utils/trace.ts same two fallbacks; optional-chained `context.sourceCode?.getScope?.(...)` in event-handlers, jsx-no-script-url, jsx-no-undef, reactivity, style-prop; `context.sourceCode?.markVariableAsUsed?.(...)` in jsx-uses-vars; `context.sourceCode?.scopeManager` in exhaustive-deps. `git grep -nE "getSourceCode|context\.getScope|getScope\?\.|markVariableAsUsed\?\.|getAncestors\?\.|sourceCode\?\."` over packages/*/src excluding vendored upstream/ -> 0 hits. The only `getSourceCode` left in the bundles is @oxlint/plugins' own eslintCompatPlugin guard (throws "Cannot call context.getSourceCode in createOnce"). The vendored, unshipped `src/upstream/` copies still contain fallbacks; they move to vendor/ in TASK-021.
- ESLint check before removal: built bundles + @typescript-eslint/parser 8.72.2 in temp consumers with eslint 9.39.5 and 10.14.0: solidjs/jsx-uses-vars (markVariableAsUsed), reactivity and jsx-no-undef (getScope), query/exhaustive-deps (getScope, getAncestors, scopeManager), errorset/no-unguarded-data-access (getScope): no fatal errors on either; the four reporting rules reported.
- READMEs (6): requirements = oxlint `>= 1.70.0 < 2` (tested 1.70.0 and 1.93.0; alpha/not semver), Node `^20.19.0 || >= 22.12.0`, optional ESLint >= 9; new "Rule names and suppression comments" section (short `<name>/<rule>` in config keys and `oxlint-disable` comments; long form ignored in disable comments on >= 1.70; rename together with the oxlint upgrade; diagnostics `<name>(<rule>)`). solidjs: jsx-uses-vars note corrected (works since 1.56; usually redundant under oxlint; preset decision pending parity work in TASK-024) and table row.
- Changeset .changeset/oxlint-1.70-contract.md: all six **minor** (breaking) with migration steps.

## Decision
- ts-no-assert's TSTypeOperator("const") branch (TASK-008 note) is kept: it is a defensive AST-shape check, not a pre-1.70 context fallback, and costs nothing.

## Verification
- unit 225/0 on pinned and with the 1.70.0 RuleTester; CLI 162/0 on pinned and OXLINT_BIN=1.70.0; compat 40/0 (ESLint 9); pack-smoke on 1.70.0 PASS (npm accepts the peer range).
- `bun run gate` exit 0.

Consumer-visible change: yes (breaking requirements).
<!-- SECTION:NOTES:END -->
