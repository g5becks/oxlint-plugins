---
"oxlint-plugin-solidjs": minor
---

`event-handlers` follows Solid 2.0 at `settings.solidjs.version: 2`: only `on` + an uppercase letter is an event handler.
- A function passed to a lowercase `on*` on a native element, directly or through a spread object, is reported (`lowercase-handler`). In 2.0 it's stringified into an attribute and never runs. It's autofixed to the camelCase name for known DOM events.
- A dynamic value of unknown type gets a suggestion.
- A string on a lowercase `on*` is valid (the inline-handler attribute).
- The messages no longer suggest the removed `attr:` prefix.

Version 1 is unchanged. The fix-safety suite now checks a rule at both versions when it has fixtures for both.
