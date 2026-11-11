---
id: TASK-027
title: 'immutable: Option parity for no-let and documented option mapping (R8)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 no-let supports allowInFunctions and ignoreIdentifierPattern with schema and tests
- [ ] #2 The README maps the immutable rules' options to eslint-plugin-functional's
- [ ] #3 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
