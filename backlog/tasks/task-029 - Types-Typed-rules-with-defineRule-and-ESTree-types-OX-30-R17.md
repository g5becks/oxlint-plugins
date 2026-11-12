---
id: TASK-029
title: 'Types: Typed rules with defineRule and ESTree types (OX-30, R17)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-12T13:46:00Z'
labels:
  - types
milestone: m-3
dependencies:
  - TASK-028
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R17. The 59 shipped rule and util files contain 454 `: any`, no `defineRule()` wrappers and no `@oxlint/plugins` types, so oxlint's ESTree changes can't be caught at compile time.

## Implementation
1. Wrap every rule in `defineRule` from `@oxlint/plugins`; type visitors with its `ESTree` types.
2. Enable `noImplicitAny` for package `src/` (vendored code excluded).
3. Count `: any` in shipped code with a recorded command (for example `rg -c ': any' packages/*/src`) before and after.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every rule is wrapped in defineRule and visitors use @oxlint/plugins ESTree types
- [x] #2 noImplicitAny is on for package sources; ': any' in shipped code is at most 45 (from 454), counted with the recorded command
- [x] #3 Behavior unchanged: unit, CLI, parity and bench diagnostic counts match
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Record before counts: grep -rn ': any' packages/*/src | wc -l (lines, the audit's method) plus occurrence counts of ': any', 'as any', 'any[]', 'Array<any>'.
2. Wrap every rule in defineRule from @oxlint/plugins (runtime no-op); visitor nodes and context typed contextually; helpers typed with ESTree types; narrow on node.type.
3. defaultOptions: drop dead top-level 'defaultOptions: []'; move non-empty defaults into meta.defaultOptions only where they equal the runtime fallback (verified per rule); immutable-data declares its effective ignoreImmediateMutation=false and a follow-up task decides alignment with upstream (true).
4. noImplicitAny: already on via strict:true for package src (verify with tsc --showConfig equivalent); keep.
5. Behavior unchanged: unit, upstream, compat, CLI (diagnostic counts), parity report counts, bench counts identical before/after.
6. After count <= 45; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- Every rule wrapped in `defineRule` from @oxlint/plugins (runtime no-op; the two query property-order rules via `createPropertyOrderRule`, which returns `defineRule(...)`). Visitor nodes and `context` are typed contextually; helpers use `ESTree` types (Node, CallExpression, ...) and Context/SourceCode/Scope/Variable/Reference/Fixer/Fix types.
- Per-package `utils/options.ts` `ruleOptions<T>(context)`: the one cast from JSON options to the rule's option shape (options are schema-validated by oxlint/ESLint first).
- solidjs: one shared `isFunctionNode` type guard (utils/functions.ts) replaces 4 copies.
- noImplicitAny: already on via `strict: true` in tsconfig.base.json (all package sources and tests); verified by tsc reporting TS7006 (implicit any) errors during this task.
- defaultOptions: 33 dead top-level `defaultOptions: []` removed; errorset `[{}]` x2 removed; non-empty defaults moved into `meta.defaultOptions` only where equal to the runtime fallback (no-let, no-throw-statements, prefer-property-signatures, type-declaration-immutability, prefer-immutable-types, solidjs no-innerhtml, reactivity). immutable-data declares its effective `ignoreImmediateMutation: false` (old dead declaration said true = upstream default) -> follow-up TASK-041 (m-4).

## Counts (recorded command)
- `grep -rn ': any' packages/*/src | wc -l`: before 418 (audit 454 before TASK-021..028 changes), after 9 (all in solidjs/rules/reactivity.ts: checkForTrackedScopes/checkForSyncCallbacks/handleTrackedScopes/markPropsOnCondition/onFunctionEnter/Exit, the dispatcher code TASK-030 restructures).
- Occurrences (`grep -rhoE`): ': any' 504 -> 11; 'as any' 5 -> 0; 'any[]' 8 -> 0; 'Array<any>' 15 -> 0; '<any>' 21 -> 0.

## Behavior unchanged (AC #3)
- Unit (Node) 298/298 before and after; upstream query 1457 pass + 5 skipped, solid 462 + 4 skipped (same); compat 41; CLI 269/269; bench 6/6.
- Diagnostics snapshot (every rule of each plugin enabled, --threads 1, on tests/fixtures/corpus + tests/cli/fixtures + tests/bench/fixtures, sorted file:offset:code:message): 7218 diagnostics, byte-identical before/after (errorset 18, immutable 6969, ts-no-assert 121, query 19, router 10, solidjs 81).
- Parity report (`bun scripts/parity.ts --out`): byte-identical before/after (0 diff lines).

## Decisions
- Structural walks (query getNestedIdentifiers, reactivity walkTree) read fields through one `Record<string, unknown>` view instead of `any`, keeping upstream's presence-based semantics.
- Where oxc types exclude a shape the old code tolerated (Babel "StringLiteral", `typeParameters`, TSParameterProperty.typeAnnotation, regex/bigint on Literal), the check is kept with a narrow cast and comment, not removed, so behavior is identical.
- Impossible-null token cases in solidjs/imports removeSpecifierFromNode now return null (no fix) instead of throwing.
- No `: any` count change in tests (out of scope: shipped code only).

## Consumer-visible
- meta.defaultOptions declared (immutable, solidjs): patch changeset .changeset/typed-rules-default-options.md. No lint result changes.

Verified with scripts/ci-local.sh (e3ce3fa, PASS); GitHub Actions unavailable (billing lock). Incl. unit/CLI on oxlint 1.70.0 floor and eslint-compat 9/10.
<!-- SECTION:NOTES:END -->
