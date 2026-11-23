---
"oxlint-plugin-solidjs": minor
---

Solid 2.0 is now an opt-in. The new `settings.solidjs.version` setting (`1` by default, or `2`) declares the Solid major version your code targets, and the new `configs["recommended-v2"]` preset sets it to 2 for ESLint flat config. oxlint users add `"settings": { "solidjs": { "version": 2 } }` to `.oxlintrc.json`. Version 1 (the default) changes nothing. The README's "Solid 2.0" section shows the setup; the rules gain version-2 behavior in later changes.
