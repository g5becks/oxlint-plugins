---
id: TASK-036
title: 'Licensing: Upstream copyright notices for ported rules'
status: To Do
assignee: []
created_date: '2026-11-11T17:52:00Z'
labels:
  - licensing
milestone: m-2
dependencies:
  - TASK-007
priority: medium
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Found in TASK-007. The plugins are ports of MIT-licensed upstream projects (eslint-plugin-solid, eslint-plugin-functional, @tanstack/eslint-plugin-query and -router, eslint-plugin-no-type-assertion). MIT requires keeping the upstream copyright and permission notice in copies or substantial portions; the published tarballs only carry this repo's LICENSE (added in TASK-007).

## Implementation
Add a THIRD_PARTY_NOTICES (or a section in each package LICENSE) with each upstream's copyright line and license text for the code it ports, include it in `files`, and check it in pack-smoke.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each package tarball contains the copyright notice and license of every upstream project it ports
- [ ] #2 pack-smoke verifies the notice file is present
<!-- AC:END -->
