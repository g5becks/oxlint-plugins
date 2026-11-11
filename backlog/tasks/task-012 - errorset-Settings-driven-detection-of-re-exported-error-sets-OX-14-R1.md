---
id: TASK-012
title: 'errorset: Settings-driven detection of re-exported error sets (OX-14, R1)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
labels:
  - errorset
milestone: m-1
dependencies:
  - TASK-011
documentation:
  - oxlint-plugins-audit.md
priority: high
type: feature
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit R1 (High). `createErrorsetImportTracker` (`detect-errorset-imports.ts:6,39`) only recognizes `@takinprofit/errorset` imports and same-file `errorSet(...).init()` declarations, and every rule returns early otherwise. agentx imports its sets from `@agentx/core`, so 0 of 3 probe violations are reported.

## Implementation
1. Read settings from `context.settings.errorset`:
   ```json
   "settings": { "errorset": { "modules": ["@takinprofit/errorset", "@agentx/core"], "guardPattern": "^[A-Z]\\w*(Error|Err)$" } }
   ```
   Defaults: `modules: ["@takinprofit/errorset"]` and that `guardPattern`.
2. Identifiers imported from a configured module (named or aliased) whose imported name matches `guardPattern` are error-set guards. Type-only imports are not. Decide how to treat namespace imports (`import * as core from "@agentx/core"` then `core.UserError`), and record it.
3. Keep same-file detection unchanged. Invalid settings must not crash the rule: ignore them, and record the behavior.
4. Document the settings in the plugin README and in the preset docs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [ ] #2 With settings.errorset.modules including @agentx/core, the Appendix A re-export probe reports 3 of 3; without the setting, behavior is unchanged
- [ ] #3 Tests cover aliased imports, type-only imports (not guards), the guardPattern and invalid settings
- [ ] #4 The README documents the settings with an example
- [ ] #5 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [ ] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->
