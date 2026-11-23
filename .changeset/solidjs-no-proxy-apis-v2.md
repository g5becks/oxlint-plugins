---
"oxlint-plugin-solidjs": minor
---

`no-proxy-apis` (off by default) follows Solid 2.0 at `settings.solidjs.version: 2`:
- it reports the store APIs imported from `solid-js` (`createStore`, `createProjection`, `createOptimisticStore`);
- it checks `merge` for function sources, which need a Proxy.

`omit` isn't reported: in @solidjs/signals 2.0.3 it falls back to a plain copy without Proxy. Version 1 is unchanged.
