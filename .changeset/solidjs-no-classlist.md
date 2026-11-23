---
"oxlint-plugin-solidjs": minor
---

New rule `no-classlist` (Solid 2.0, `settings.solidjs.version: 2` only; `error` in `recommended-v2`) reports `classList` on native elements, which Solid 2.0 removed. It autofixes into `class` object/array values, merged with an existing `class`: `class="card" classList={{ a: x() }}` becomes `class={["card", { a: x() }]}`.
