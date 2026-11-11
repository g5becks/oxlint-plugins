---
id: TASK-035
title: >-
  Maintainer: Publish releases, verify GitHub workflows and enable trusted
  publishing
status: To Do
assignee:
  - '@takinprofit'
created_date: '2026-11-11T16:39:00Z'
labels:
  - maintainer
  - blocked-external
dependencies: []
documentation:
  - oxlint-plugins-audit.md
priority: medium
type: chore
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Steps only the maintainer can do: npm publishing with 2FA, and checks that need GitHub Actions (billing-locked).

## Steps (maintainer)
1. Publish each prepared release (0.2.0, then 0.3.0) with the commands in its release-prep task notes; create the GitHub releases.
2. Once Actions is restored: run ci.yml with workflow_dispatch on main and confirm every leg; confirm the weekly scheduled run.
3. Configure npm trusted publishing for all six packages and verify release.yml on the next tag.
4. The agentx migration (audit OX-40 and OX-42) is a separate, later epic; see docs/migration-0.2.md.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 0.2.0 and 0.3.0 of each package are published in order with GitHub releases
- [ ] #2 ci.yml passes on GitHub for every blocking leg
- [ ] #3 Trusted publishing is configured for all six packages and release.yml is verified on a tag
<!-- AC:END -->
