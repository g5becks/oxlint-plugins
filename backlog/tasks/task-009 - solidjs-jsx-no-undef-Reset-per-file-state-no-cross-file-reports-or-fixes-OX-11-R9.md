---
id: TASK-009
title: >-
  solidjs/jsx-no-undef: Reset per-file state; no cross-file reports or fixes
  (OX-11, R9)
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - solidjs
  - bug
milestone: m-1
dependencies:
  - TASK-008
documentation:
  - oxlint-plugins-audit.md
priority: high
type: bug
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R9 (Critical). `missingComponentsSet` (`jsx-no-undef.ts:118`) is created once per worker in `createOnce`, filled in `checkIdentifierInJSX`, read in `Program:exit` and never cleared. After one file misses an import, every later file in that worker reports "'Show' should be imported from 'solid-js'.", including `.ts` files without JSX, and the report carries a fix that inserts the import. Three identical runs produced 37, 434 and 251 spurious reports. The leak also happens under ESLint.

## Implementation
1. Commit the Appendix A probe (`a.tsx` with `<Show>` and no import, plus five clean files, `--threads 1`) as a failing test using the state-isolation harness.
2. Reset all per-file state in `before()`.
3. Determinism: lint the corpus (the repo fixtures plus `client/`) three times multi-threaded and compare normalized outputs.
4. Fix safety: `oxlint --fix` over [invalid, valid x5] changes only the invalid file.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [ ] #2 Three multi-threaded corpus runs produce identical normalized output (hashes recorded)
- [ ] #3 oxlint --fix over one invalid and five valid files changes only the invalid file (test)
- [ ] #4 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
