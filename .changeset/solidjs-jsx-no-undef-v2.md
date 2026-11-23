---
"oxlint-plugin-solidjs": patch
---

`jsx-no-undef` auto-imports Solid 2.0's control-flow components at `settings.solidjs.version: 2`: `Show`, `For`, `Switch`, `Match`, `Loading`, `Errored`, `Repeat` and `Reveal`. It no longer auto-imports the removed `Index` there. Version 1 is unchanged.
