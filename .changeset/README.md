# Changesets

Every consumer-visible change needs a changeset for each affected package:

```bash
bun x changeset          # interactive, or write .changeset/<name>.md by hand:
```

```md
---
"oxlint-plugin-errorset": minor
---

**Breaking:** what changed, why, and the migration steps.
```

Versions are independent per package. `scripts/release-prepare.ts` runs `changeset version`
on a release branch; see CONTRIBUTING.md.
