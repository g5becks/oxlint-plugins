# solidjs/no-unknown-namespaces

Disallows JSX namespace prefixes (`ns:name`) that Solid doesn't support.

- **Version 1** (the default): Solid 1.x's namespaces (`on:`, `oncapture:`, `use:`, `prop:`,
  `attr:`, `bool:`, plus `xmlns:`/`xlink:`), as in
  [eslint-plugin-solid 0.14.5](https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/no-unknown-namespaces.md).
- **Version 2** (`settings.solidjs.version: 2`): only `prop:` and the XML namespaces `xmlns:`,
  `xlink:` and `xml:` are allowed, plus `allowedNamespaces`. The 2.0 compiler rejects the removed
  ones on native elements, so the rule mostly helps in the editor.

Sources: MIGRATION §Attributes & events: closer to HTML (and fewer namespaces); RFC 07 §Follow HTML
standards by default, §Directives via ref (and removal of `use:`), §Removals
([solidjs/solid@cd201ce](https://github.com/solidjs/solid/tree/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0)).

## Version 2

| Namespace | Report | Suggestion (not an autofix) |
|---|---|---|
| `on:x` | `removedOn`: use the camelCase handler, or for listener options a ref callback that calls `addEventListener` | `on:click` → `onClick` |
| `oncapture:x` | `removedOn` | none: a plain handler would lose the capture phase |
| `attr:x`, `bool:x` | `removedAttr`: write the plain attribute; booleans add or remove it | `attr:x` → `x` |
| `use:x` | `removedUse`: a ref directive factory | `use:x={v}` → `ref={x(v)}`, `use:x` → `ref={x}` (none if the element already has a `ref`: compose with an array) |
| `class:`, `style:` | `style`: use the `class` / `style` object values | none |
| anything else | `unknownV2` | none |

The replacements are suggestions, not autofixes, because each changes how the attribute behaves.
`on:click` is a native listener and `onClick` a delegated one, for example. Namespaced props on
components keep the version-1 handling.
