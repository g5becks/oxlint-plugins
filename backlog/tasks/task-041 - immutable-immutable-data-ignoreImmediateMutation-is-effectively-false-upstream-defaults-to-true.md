---
id: TASK-041
title: >-
  immutable/immutable-data: ignoreImmediateMutation is effectively false;
  upstream defaults to true
status: To Do
assignee: []
created_date: '2026-11-11T23:39:00Z'
labels:
  - immutable
milestone: m-4
dependencies:
  - TASK-029
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found in TASK-029. immutable-data declared top-level defaultOptions with ignoreImmediateMutation: true (eslint-plugin-functional's default), but top-level defaultOptions are ignored by oxlint and ESLint (only meta.defaultOptions is read), and the rule reads a missing option as false. So since 0.1 the rule reports immediate mutations (e.g. `[].push(x)`, `new Map().set(k, v)`) unless users opt in. TASK-029 kept the behavior and declared the effective default (false) in meta.defaultOptions. Decide whether to switch to upstream's true (fewer reports; a behavior change needing a changeset and migration note).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Decision recorded; if switching, default true with tests, changeset and README note
<!-- AC:END -->
