---
"oxlint-plugin-errorset": minor
---

New `settings.errorset` (`modules`, `guardPattern`): error sets re-exported from your own modules (for example `import { UserError } from "@acme/core"`) are now recognized by all five rules. Previously every rule was silent unless the file imported `@takinprofit/errorset` directly and defined the set in the same file. Without the setting, behavior is unchanged. Type-only and namespace imports are not treated as guards; invalid settings are ignored. Enabling the setting can surface new reports; see the README.
