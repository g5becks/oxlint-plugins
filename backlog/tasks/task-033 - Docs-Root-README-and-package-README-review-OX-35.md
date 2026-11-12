---
id: TASK-033
title: 'Docs: Root README and package README review (OX-35)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-11T16:39:00Z'
updated_date: '2026-11-12T14:38:00Z'
labels:
  - docs
milestone: m-3
dependencies:
  - TASK-032
documentation:
  - oxlint-plugins-audit.md
priority: low
type: chore
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Audit H6 and H7. The root README is a single line (`# Biome-Plugins`).

## Implementation
A root README with the packages table (name, rules, purpose), the compatibility table (oxlint, ESLint, Node), links to the migration guides, how to configure plugins with short names, and contribution and testing instructions (linking CONTRIBUTING.md). Check every package README against the current behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The root README has packages, compatibility, configuration, migration and contribution sections
- [x] #2 Every package README matches current rules, options, settings and supported versions
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Root README: packages table (npm name, rule prefix, rule count, purpose, upstream), compatibility table (oxlint/ESLint/Node with tested versions), configuration (.oxlintrc.json jsPlugins, short rule names, suppression comments, ESLint flat config + presets), migration (0.2 guide + codemod; 0.3 changes), parity, contributing (CONTRIBUTING.md, AGENTS.md, gate, ci-local), license.
2. Package READMEs vs code (script-checked): rule lists, preset severities, option keys, settings, versions. Known gaps: solidjs Recommended column wrong for no-proxy-apis/no-array-handlers (preset off); solidjs options undocumented for 10 rules.
3. Gate; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Outcome
- Root README.md (was `# Biome-Plugins`): packages table (npm name, rule prefix, rule count, purpose, upstream + version), compatibility table (oxlint >= 1.70.0 < 2, tested 1.70.0 + pinned 1.93.0 + latest advisory; ESLint >= 9, tested 9.39.5 and 10.14.0; Node ^20.19.0 || >= 22.12.0, CI images node 22 and 24), configuration (oxlint jsPlugins + short rule names, suppression comments, long-form caveat; ESLint flat config + recommended preset), migration (0.1 -> 0.2 guide + codemod; 0.2 -> 0.3 actionable changes: prefer-immutable-types option validation, stable-query-client suggestion), contributing (CONTRIBUTING.md, AGENTS.md, gate, ci-local), license. Facts checked against package.json files, ci-local.sh images, node_modules versions, docs/migration-0.2.md.

## Package READMEs checked against code (scripted, temporary scripts)
- Every rule of every plugin is listed in its README (0 missing, 0 unknown rule rows).
- Recommended column vs `configs.recommended`: solidjs `no-proxy-apis` said error and `no-array-handlers` said warn, preset has both off -> fixed to `—` (README fixed, preset unchanged: it matches upstream's recommended set).
- Descriptions vs meta.docs: fixed solidjs `no-array-handlers` (array-form handlers, not "array index"), `no-innerhtml` (innerHTML + dangerouslySetInnerHTML; outerHTML isn't checked), `prefer-classlist` (classnames helpers, not ternaries).
- Option keys from each rule's schema present in its README: all present except solidjs (event-handlers, jsx-no-duplicate-props, jsx-no-undef, no-innerhtml, no-unknown-namespaces, prefer-classlist, reactivity, style-prop; self-closing-comp's component/html only matched incidentally) -> new solidjs "Options" section with every option, type and default (from the schemas; jsx-no-undef AUTO_COMPONENTS and typescriptEnabled behavior verified in code).
- errorset: settings section notes the TASK-031 file skip and its escape-sequence edge.
- Versions: all six READMEs state oxlint >= 1.70.0 < 2 (tested 1.70.0 and 1.93.0), Node ^20.19.0 || >= 22.12.0, ESLint >= 9 (unchanged, consistent with package.json).
- immutable option mapping (TASK-027) and solidjs deep-JSX section (TASK-030) already current.

## Verification
- `bun run gate`: exit 0.
- Changeset .changeset/readme-review-0-3.md (solidjs, errorset patch: README ships in the tarball).

Verified with scripts/ci-local.sh (f2fbffe, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
