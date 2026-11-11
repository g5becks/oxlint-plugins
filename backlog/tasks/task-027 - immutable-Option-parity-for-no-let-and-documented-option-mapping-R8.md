---
id: TASK-027
title: 'immutable: Option parity for no-let and documented option mapping (R8)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T23:29:00Z'
labels:
  - immutable
milestone: m-2
dependencies:
  - TASK-026
documentation:
  - oxlint-plugins-audit.md
priority: low
type: feature
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R8. `immutable/no-let` lacks upstream's `allowInFunctions` and `ignoreIdentifierPattern`; `no-throw-statements` option names differ from later upstream majors without documentation.

## Implementation
Add both options to `no-let` (schema, docs, tests, defaults matching upstream). Document the option-name mapping to eslint-plugin-functional for the immutable rules in the README.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 no-let supports allowInFunctions and ignoreIdentifierPattern with schema and tests
- [x] #2 The README maps the immutable rules' options to eslint-plugin-functional's
- [x] #3 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Failing unit tests first: allowInFunctions (let in function body / nested block / arrow allowed; top-level, class static block still reported) and ignoreIdentifierPattern (string/array; every named declarator must match; destructuring has no name so not ignored), matching eslint-plugin-functional 10.0.1 semantics.
2. Implement in no-let.ts: schema (allowInFunctions boolean, ignoreIdentifierPattern string|string[]), defaults false.
3. Extend schemas CLI cases; README options table mapping immutable rules' options to eslint-plugin-functional (incl. no-throw-statements allowToRejectPromises naming).
4. Changeset (immutable minor: new options). Gate, notes, commit, ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- immutable/no-let: new options allowInFunctions (boolean, default false: any `let` inside a function body, at any nesting, is allowed) and ignoreIdentifierPattern (string | string[]: declaration ignored when every Identifier declarator matches; destructured declarators have no name; no named declarator -> not ignored). Schema rejects other keys/types.
- packages/immutable/README.md: "Options compared with eslint-plugin-functional" table for all 8 immutable rules (no-throw-statements allowInAsyncFunctions vs upstream allowToRejectPromises; prefer-immutable-types accepted/rejected keys; type-declaration-immutability identifiers == upstream ignoreIdentifierPattern; immutable-data; readonly-type keyword only).

## Consumer-visible
- New no-let options (immutable minor, additive, not breaking). Changeset .changeset/immutable-no-let-options.md.

## Verification
- Failing first: `node --test packages/immutable/tests/no-let.test.ts` -> 5 pass / 16 fail ("Options validation failed ... allowInFunctions"); after: 21 pass / 0 fail.
- Parity measured: the 19 option cases run through ESLint Linter with eslint-plugin-functional 10.0.1 no-let and the port: 19/19 identical report counts, 0 diffs (temporary script, not committed).
- `bun test ./tests/cli/schemas.cli.test.ts`: 84 pass (no-let now 4 valid / 5 invalid sets).
- `bun run gate`: exit 0; unit 298/298, upstream query 1457 (+5 skipped), solid 462 (+4 skipped), compat 41, CLI 269/269, bench 4/4.

## Decisions / follow-ups
- Option semantics copied from upstream 10.0.1 source (isInFunctionBody via enclosing function bodies; shouldIgnorePattern every-match over declarator names).
- Found: type-declaration-immutability `identifiers` is an ignore pattern under a misleading name (undocumented, untested). Documented as is; follow-up TASK-040 (m-4) to add ignoreIdentifierPattern / deprecate.

Verified with scripts/ci-local.sh (dd26164, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
