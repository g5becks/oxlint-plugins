---
id: TASK-012
title: 'errorset: Settings-driven detection of re-exported error sets (OX-14, R1)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-11T20:21:00Z'
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
- [x] #1 The audit Appendix A probe for this finding is committed first as a failing oxlint RuleTester (or CLI) test, then passes; both runs are recorded in the notes
- [x] #2 With settings.errorset.modules including @agentx/core, the Appendix A re-export probe reports 3 of 3; without the setting, behavior is unchanged
- [x] #3 Tests cover aliased imports, type-only imports (not guards), the guardPattern and invalid settings
- [x] #4 The README documents the settings with an example
- [x] #5 A changeset in .changeset/ covers every affected package with the right bump; breaking changes say so and include migration steps
- [x] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS (GitHub Actions is billing-locked; note 'Verified with scripts/ci-local.sh (<sha>, PASS)')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the committed R1 probe (c75f044, test.failing TASK-012) to the Appendix A 3-violation shape with settings.errorset.modules; record failing run.
2. utils/settings.ts: parse settings.errorset (modules, guardPattern), defaults, invalid values ignored per key, cached per settings object.
3. Tracker: configured modules -> guard-named named/aliased imports are guards; errorSet/isErr recognized; type-only skipped; namespace/default imports not tracked; library always recognized. Rules pass settings in before()/Program.
4. Unit tests (aliased, type-only x2, guardPattern, namespace, invalid x4, same-file) + parse tests; README settings section; changeset.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Failing first
- Probe committed in c75f044 as `test.failing("TASK-012: reports error sets imported from a re-exporting module")` (verified then: 0 diagnostics with real oxlint 1.93.0).
- Extended to the Appendix A 3-of-3 shape (tests/cli/fixtures/errorset/reexported-set.ts: throw in a function -> no-throw-errorset; guard on the catch parameter -> no-catch-errorset; `throw new Error` in a function that returns an errorset value -> no-new-error-in-errorset-fn) with `settings.errorset.modules: ["@agentx/core"]`. Before the fix: FAILED (0 of 3 reported). After: 3 of 3 (lines 8, 12, 17; codes errorset(no-catch-errorset), errorset(no-new-error-in-errorset-fn), errorset(no-throw-errorset)).
- "Without the setting, behavior is unchanged": same fixture without settings -> 0 diagnostics (passes before and after).

## Implementation
- packages/errorset/src/utils/settings.ts: `parseErrorsetSettings` / `readErrorsetSettings(context)`; defaults modules ["@takinprofit/errorset"], guardPattern `^[A-Z]\w*(Error|Err)$`; parsed once per settings object (WeakMap).
- Tracker: imports from a configured module: named/aliased specifier whose IMPORTED name matches guardPattern -> local name is a guard; `errorSet`/`isErr` -> recognized as the library's; either sets hasErrorsetImport. `@takinprofit/errorset` handling unchanged (always a module). All five rules call `tracker.reset(readErrorsetSettings(context))` in before() and Program.

## Decisions
- Namespace imports (`import * as core` then `core.UserError`) are NOT treated as guards: the rules match guards by identifier name; supporting member-expression guards would change every rule's matching. Documented in the README; a valid test case pins the behavior.
- Default imports are ignored.
- Type-only imports (declaration `import type` and specifier `import { type X }`) are never guards; mutation check: removing both importKind checks fails exactly those 2 valid cases.
- Invalid settings never throw: per key, a `modules` value that is not an array of non-empty strings, or a `guardPattern` that is not a string or does not compile, falls back to the default; a non-object `settings.errorset` means all defaults. Tested.
- `@takinprofit/errorset` is always included even when `modules` omits it (keeps same-file detection unchanged).

## Verification
- packages/errorset/tests/settings.test.ts: 9 valid + 5 invalid RuleTester cases with per-case settings, 3 parse tests -> errorset unit 66/66.
- README: new "Settings" section with an example, a table, and notes on type-only/namespace imports, invalid settings and the recommended config.
- Changeset .changeset/errorset-settings-modules.md: oxlint-plugin-errorset minor (new opt-in feature; default unchanged).
- `bun run gate` exit 0: unit 153/0, compat 34/0, repo 18/0, CLI 125/0, bench 4/0. No test.failing markers remain in the repo.

Consumer-visible change: yes (new settings).

Verified with scripts/ci-local.sh (5403c0c, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
settings.errorset.modules/guardPattern make all five errorset rules recognize re-exported sets: the Appendix A probe goes from 0 to 3 of 3; default behavior unchanged; type-only and namespace imports excluded; invalid settings ignored; README documents it. Changeset: errorset minor. Verified with scripts/ci-local.sh (5403c0c, PASS).
<!-- SECTION:FINAL_SUMMARY:END -->
