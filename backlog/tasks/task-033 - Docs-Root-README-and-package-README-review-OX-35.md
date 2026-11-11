---
id: TASK-033
title: 'Docs: Root README and package README review (OX-35)'
status: To Do
assignee: []
created_date: '2026-11-11T16:39:00Z'
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
- [ ] #1 The root README has packages, compatibility, configuration, migration and contribution sections
- [ ] #2 Every package README matches current rules, options, settings and supported versions
<!-- AC:END -->
