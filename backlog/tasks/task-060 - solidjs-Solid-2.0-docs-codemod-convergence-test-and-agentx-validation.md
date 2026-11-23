---
id: TASK-060
title: 'solidjs: Solid 2.0 docs, codemod convergence test and agentx validation'
status: To Do
assignee: []
created_date: '2026-11-23T20:29:00Z'
labels:
  - solidjs
  - solid2
milestone: m-5
dependencies:
  - TASK-044
  - TASK-045
  - TASK-046
  - TASK-047
  - TASK-048
  - TASK-049
  - TASK-050
  - TASK-051
  - TASK-052
  - TASK-053
  - TASK-054
  - TASK-055
  - TASK-056
  - TASK-057
  - TASK-058
  - TASK-059
references:
  - >-
    https://github.com/solidjs/solid/blob/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0/MIGRATION.md
priority: high
type: chore
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Close-out for the milestone.

- **Docs:** the README Solid 2 section is final (rule table with version columns, recommended vs recommended-v2), and `docs/migration-solid2.md` explains the codemod: set version 2, run `oxlint --fix` (safe fixes), then review `--fix-suggestions` (mergeProps → merge and the others).
- **Codemod convergence:** a CLI test applies every version-2 fixable rule together to one fixture. It must reach a fixed point in at most two `--fix` passes, parse, and typecheck.
- **agentx validation (read-only; nothing under /Users/takinprofit/Dev/agentx is modified):**
  - With version-1 settings (the client's current .oxlintrc.json rules), the branch build reports exactly what the pinned baseline build (main) reports: zero new findings.
  - With version 2, in report mode (no `--fix`), the counts per rule are recorded in the task notes and sent to agentx-pm.
- **Final check:** `bash scripts/ci-local.sh HEAD` prints `RESULT: PASS` before the final review request.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 README and docs/migration-solid2.md describe opt-in, the rule changes and the codemod
- [ ] #2 The combined version-2 --fix fixture converges in at most two passes and passes fix-safety
- [ ] #3 agentx client, version 1: zero new findings against the main baseline (command and output in notes)
- [ ] #4 agentx client, version 2 report mode: counts per rule in notes, sent to agentx-pm
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS (sha in notes)
<!-- AC:END -->
