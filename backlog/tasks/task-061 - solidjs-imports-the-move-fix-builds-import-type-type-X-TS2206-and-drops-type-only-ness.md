---
id: TASK-061
title: >-
  solidjs/imports: the move fix builds import type { type X } (TS2206) and drops
  type-only-ness
status: Done
assignee:
  - '@claude'
created_date: '2026-11-23T21:18:00Z'
updated_date: '2026-11-23T21:20:00Z'
labels:
  - solidjs
milestone: m-4
dependencies: []
priority: high
type: bug
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found during TASK-048 (2026-11-23). Affects released 0.2.x/0.3.x at version 1 (the default).

The fix that moves a specifier to its correct solid-js module (imports.ts, the 1.x path) mishandles type specifiers:
1. An inline type specifier (`import { type JSX, render } from "solid-js/web"`) is moved into a new declaration `import type { type JSX } from "solid-js"`. That is TS2206 ("The 'type' modifier cannot be used on a named import when 'import type' is used on its import statement"), so `oxlint --fix` breaks a TypeScript build.
2. A specifier of a type-only declaration moved into an existing value import is appended without `type` (`import type { JSX } from "solid-js/web"` + `import { createSignal } from "solid-js"` gives `import { createSignal, JSX }`), which loses type-only-ness (TS1484 under verbatimModuleSyntax / isolatedModules).

Repro: tests/cli fix-safety style, or the probe in the task notes. Fix: keep the `type` modifier exactly once (inline when the target is a value import, declaration-level when a new declaration is created for a type-only source).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A failing test first: both cases, with the expected outputs
- [x] #2 All existing imports tests and the vendored upstream imports suite pass unchanged
- [x] #3 A changeset (patch) for oxlint-plugin-solidjs; bun run gate passes
- [x] #4 Inline type specifiers never produce import type { type X }: a new declaration keeps the inline modifier, a type-only target drops it
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Scope narrowed (2026-11-23): the second symptom (a type-only declaration's specifier merged into a value import loses `type`) is what upstream eslint-plugin-solid 0.14.5's vendored imports test asserts (`import type { Component } from "solid-js/store"` -> `import { createSignal, Component }`). That suite runs unmodified as the parity contract and tests must not be weakened, so the port keeps upstream's output there; it only fails under verbatimModuleSyntax. The TS2206 case (any TS setup) is fixed. Recorded in PARITY.md#solid-imports-inline-type-specifiers. Diagnostics unchanged (all-rules diff vs the 2fd695f build 71 = 71, 20 = 20); upstream 462/462; gate PASS.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
imports' 1.x move fix no longer builds `import type { type X }` (TS2206): an inline type specifier keeps its modifier in a new declaration and drops it when merged into a type-only declaration. The value-import merge keeps upstream 0.14.5 behavior (asserted by the vendored suite).
<!-- SECTION:FINAL_SUMMARY:END -->
