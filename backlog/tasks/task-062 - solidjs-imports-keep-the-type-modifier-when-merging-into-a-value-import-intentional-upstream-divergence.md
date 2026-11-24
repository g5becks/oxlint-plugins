---
id: TASK-062
title: >-
  solidjs/imports: keep the type modifier when merging into a value import
  (intentional upstream divergence)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-23T21:25:00Z'
updated_date: '2026-11-23T21:27:00Z'
labels:
  - solidjs
  - parity
milestone: m-4
dependencies:
  - TASK-061
priority: medium
type: bug
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Decision (agentx-pm, delegated by the owner, 2026-11-23): diverge from eslint-plugin-solid 0.14.5 and keep the `type` modifier when the imports move fix merges a type-only declaration's specifier into a value import: `import type { Component } from "solid-js/store"` + `import { createSignal } from "solid-js"` gives `import { createSignal, type Component } from "solid-js"`, not upstream's `import { createSignal, Component }`.

Rationale: `import { createSignal, type Component }` is valid TypeScript in every configuration (TS >= 4.5); upstream's output breaks a build under verbatimModuleSyntax (TS1484), which modern templates increasingly enable. A fixer should never produce output that fails to compile in a supported configuration.

Mechanism (option A): tests/upstream/solid/parity.ts gains an optional `output` override. A matched vendored case still runs, against the override; the vendored files stay byte-identical; the test name carries the PARITY.md anchor. An entry that matches no case fails loudly (no stale entries).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Failing tests first: the imports case and the parity override unit tests
- [x] #2 parity.ts output overrides run the case against the override with the PARITY.md anchor in the test name; vendored files unchanged
- [x] #3 An override or skip entry that matches no case (wrong index or code guard) throws
- [x] #4 PARITY.md records the intentional divergence with the rationale; TASK-061's section is updated
- [x] #5 A patch changeset; bun run gate passes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
parity.ts: Divergence.output + applyDivergences() (skip without output, run against the override with the PARITY.md anchor in the test name, throw "stale divergence" for an entry that matches no case). The shim uses it; tests/upstream/solid/parity.test.ts (6 cases, incl. the code-guard and out-of-range throws) runs in test:upstream:solid. Vendored files unchanged (git diff vendor/ empty). Upstream run: 462 vendored passes (the imports case now runs against the override), 4 skipped as before, plus 6 mechanism tests. Diagnostics unchanged (71 = 71, 20 = 20); gate PASS.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
imports keeps the type modifier when merging a type-only import into a value import (intentional divergence from upstream 0.14.5, PARITY.md#solid-imports-type-modifier, rationale from agentx-pm/owner). The upstream harness gained output overrides with a stale-entry guard.
<!-- SECTION:FINAL_SUMMARY:END -->
