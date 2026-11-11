---
"oxlint-plugin-errorset": patch
"oxlint-plugin-immutable": patch
"oxlint-plugin-ts-no-assert": patch
"oxlint-plugin-query": patch
"oxlint-plugin-router": patch
"oxlint-plugin-solidjs": patch
---

READMEs link the 0.2 migration guide (docs/migration-0.2.md), which lists every breaking change of this release and ships a dependency-free codemod (`migrate-0.2.ts`, Node >= 22.18 or Bun) that rewrites `oxlint-plugin-<name>/` to `<name>/` in disable comments and `.oxlintrc.json` rule keys. Migration: run `node migrate-0.2.ts .` and bump oxlint to >= 1.70 in the same commit.
