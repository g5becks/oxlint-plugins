---
id: TASK-029
title: 'Types: Typed rules with defineRule and ESTree types (OX-30, R17)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 Every rule is wrapped in defineRule and visitors use @oxlint/plugins ESTree types
- [ ] #2 noImplicitAny is on for package sources; ': any' in shipped code is at most 45 (from 454), counted with the recorded command
- [ ] #3 Behavior unchanged: unit, CLI, parity and bench diagnostic counts match
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
