---
id: TASK-048
title: 'solidjs/imports: Solid 2.0 module map and import-path migration at version 2'
status: To Do
assignee: []
created_date: '2026-11-23T20:29:00Z'
labels:
  - solidjs
  - solid2
milestone: m-5
dependencies:
  - TASK-043
references:
  - >-
    https://github.com/solidjs/solid/blob/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0/MIGRATION.md
priority: medium
type: feature
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
At version 2, `imports` uses the 2.0 module map, and it owns the import-path migration.

**Map:** store APIs come from `solid-js` (createStore, reconcile, snapshot, deep, createProjection, createOptimistic, createOptimisticStore), as does the rest of the core. `@solidjs/web` has render, hydrate, Portal, Dynamic, dynamic, clientOnly, isServer, isDev, renderToString, renderToStream, generateHydrationScript, HydrationScript, httpStatus, httpHeader, and the types JSX and MountableElement. Flow components that `@solidjs/web` re-exports (For, Show, Loading, …) are still preferred from solid-js, consistent with 1.x. `ComponentProps`/`ValidComponent` exist in both packages with different meanings, so they're not mapped. (MIGRATION §Imports: where things live now; RFC 09 §Renderer packages own JSX namespaces; @solidjs/web 2.0.3 `types/index.d.ts`, `types/client.d.ts`.)

**Paths (autofix, rewriting the source string):** `solid-js/web`→`@solidjs/web`; `solid-js/store`→`solid-js`, merged into an existing value import from solid-js when there is one; `solid-js/h`→`@solidjs/h`; `solid-js/html`→`@solidjs/html`; `solid-js/universal`→`@solidjs/universal`; `solid-js/jsx-runtime` and `jsx-dev-runtime`→`@solidjs/web/…` (MIGRATION §Quick rename / removal map, Import paths; RFC 09 §Migration). This is safe: the same names exist at the new path, except removed APIs, which no-removed-apis reports.

**Types:** `import type { JSX } from "solid-js"` moves to `@solidjs/web` (autofix, the existing specifier-move fix). `JSXElement` is report-only ("use Element from solid-js", RFC 09 §Removals).

**Version 1:** the map is unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A failing test is committed with or before the change (RuleTester at version 2), built from the cited guide/RFC before/after examples
- [ ] #2 At version 1 (no setting, or settings.solidjs.version: 1) the rule's existing unit, CLI and upstream-parity tests pass unchanged
- [ ] #3 Fixtures for every path in the Import paths list, the store merge into an existing solid-js import, JSX type moves, and a v1 file that keeps solid-js/web untouched at version 1
- [ ] #4 Idempotence and fix-safety are covered for the path fixes, including together with no-removed-apis on one file (unwrap from solid-js/store)
- [ ] #5 packages/solidjs/docs/rules/<rule>.md documents the version-2 behavior and cites the MIGRATION/RFC section for every check; meta.docs.url points to it
- [ ] #6 A changeset for oxlint-plugin-solidjs; bun run gate passes; Conventional Commit with this task id
<!-- AC:END -->
