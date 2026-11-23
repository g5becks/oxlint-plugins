---
"oxlint-plugin-solidjs": minor
---

`no-unknown-namespaces` follows Solid 2.0 at `settings.solidjs.version: 2`. Only `prop:` and the XML namespaces (`xmlns:`, `xlink:`, `xml:`) are allowed. The removed `on:`, `oncapture:`, `attr:`, `bool:` and `use:` report their 2.0 replacement, with suggestions: `on:click` → `onClick`, `attr:x` → `x`, `use:x={v}` → `ref={x(v)}`. Version 1 is unchanged.
