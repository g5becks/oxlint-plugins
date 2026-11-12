---
id: TASK-026
title: 'Testing: Fix-safety and option-schema suites (OX-24, R16)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T23:22:00Z'
labels:
  - testing
milestone: m-2
dependencies:
  - TASK-025
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit T5 and R16. Fixes are applied automatically by `oxlint --fix` in consumers' hooks, and oxlint aborts the whole run when options fail schema validation, so fix output and schemas are public behavior.

## Implementation
1. Fix safety: for every rule with a fix, apply `oxlint --fix` to fixtures and check that the output parses and type-checks (tsc), and for value-level fixes that behavior is preserved where testable.
2. Schemas: for every rule with options, valid option sets load and invalid ones fail with "Options validation failed" in real oxlint (1.70.0 and pinned). Tighten or loosen schemas where tests show they're wrong.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every fixable rule has a fix-safety test whose fixed output type-checks
- [x] #2 Every rule with options has valid and invalid schema tests in real oxlint 1.70.0 and pinned
- [x] #3 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- tests/cli/fix-safety.cli.test.ts: every rule with meta.fixable (21) is fixed by real `oxlint --fix` with only that rule on; output must differ from input (except suggestion-only query/exhaustive-deps, whose output must equal input), have no syntax errors, and introduce no TypeScript diagnostics the input didn't have (module-resolution TS2307/TS2792 ignored: fixture packages aren't installed). Dedicated fixtures under tests/cli/fixtures/fix-safety/ where the shared rule fixture has no auto-fixable case (solidjs/components-return-once, query/stable-query-client).
- tests/cli/schemas.cli.test.ts: all 17 rules with options have valid and invalid option sets run in real oxlint; valid sets must load (no "Options validation failed"/"Failed to setup JS plugin options", JSON output, exit <= 1 since the rule may report on the probe file), invalid sets must abort with "Options validation failed". A guard test fails if a rule with a schema has no cases.

## Bugs found and fixed (consumer-visible)
- query/stable-query-client: without a `useState`/React namespace import from react, the autofix produced `React.useState(...)` referencing an undefined `React`. Now a suggestion in that case; autofix kept when useState (incl. aliased) or a namespace is imported. 4 upstream cases registered as divergence PARITY.md#query-stable-query-client-no-react-import. ESLint integration test updated to the new contract (suggestion asserted with output; aliased-import autofix case added).
- solidjs/components-return-once: fixes to <Show>/<Switch>/<Match> now add missing solid-js imports (new ensureSolidImports in utils/fix-imports.ts; appendImports/insertImports moved there from jsx-no-undef). 3 upstream cases (invalid 5/6/7) registered: PARITY.md#solid-components-return-once-imports.
- solidjs/no-unknown-namespaces: schema had `default: []` with `minItems: 1` (copied from upstream 0.14.5); oxlint applies defaults, so options `{}` aborted the run. Default removed; `[]` still rejected.
- immutable/prefer-immutable-types: category options were `{type: object}` (anything accepted; upstream values like enforcement "Immutable" silently disabled the category). Now enforcement enum ReadonlyShallow|None|false and ignoreNamePattern string|string[], additionalProperties false.

## Changesets
- query minor (behavior change + migration), solidjs patch, immutable minor (breaking config + migration).

## Verification
- `bun test ./tests/cli/schemas.cli.test.ts ./tests/cli/fix-safety.cli.test.ts` with OXLINT_BIN=oxlint 1.70.0: 100 pass, 0 fail; pinned (node_modules/.bin/oxlint): included in gate.
- `bun run gate`: exit 0. Unit (Node) 279/279; upstream query 1457 pass + 5 skipped; upstream solid 462 pass + 4 skipped; compat 41/41; CLI 264/264; bench 4/4.

## Decisions
- Fix-safety compares TS diagnostics before/after instead of requiring zero (fixtures intentionally contain lint violations and unresolved imports).
- Suggest instead of autofix for the no-import stable-query-client case rather than auto-adding an import (a React import may come from a global/JSX runtime setup; a suggestion is reviewable).

Verified with scripts/ci-local.sh (6051ec5, PASS); GitHub Actions unavailable (billing lock). All legs pass incl. cli on oxlint floor 1.70.0 and pinned 1.93.0 (schema + fix-safety suites), eslint-compat 9/10, pack.
<!-- SECTION:NOTES:END -->
