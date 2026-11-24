# solidjs/event-handlers

Enforces naming DOM event handlers consistently, so Solid treats a prop as an event handler or an
attribute as intended.

- **Version 1** (the default): unchanged from
  [eslint-plugin-solid 0.14.5](https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/event-handlers.md).
- **Version 2** (`settings.solidjs.version: 2`): Solid 2.0's rule, under which only `on` followed by
  an uppercase letter is an event handler.

Sources: MIGRATION §Attributes & events: closer to HTML (and fewer namespaces); RFC 07 §Follow HTML
standards by default; RFC 08 §LOWERCASE_EVENT_ATTRIBUTE
([solidjs/solid@cd201ce](https://github.com/solidjs/solid/tree/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0)).

## Version 2

In 2.0, `<button onclick={handler}>` sets the `onclick` *attribute*: the function is stringified into
it and never runs, in the browser, in SSR output and through spreads. On native elements:

| Case | Report | Fix |
|---|---|---|
| A lowercase `on*` whose value is certainly a function (inline, or a `const` / function declaration) | `lowercase-handler` | autofix to the camelCase name for known DOM events (`onclick` → `onClick`, `ondoubleclick` → `onDblClick`); a suggestion otherwise |
| The same key in an object spread into the element (`{...{ onclick: fn }}`) | `lowercase-handler` | same |
| A lowercase `on*` with a dynamic value of unknown type (`onclick={props.handler}`) | `lowercase-ambiguous` (silenced by `ignoreCase`) | suggestion |
| A lowercase `on*` with a string value (`onload="this.rel='stylesheet'"`) | valid: the HTML inline-handler attribute | none |
| A camelCase handler with a static string or number (`onClick="go()"`) | `detected-attr-v2`: for the inline-handler attribute, use the lowercase name | none |
| A camelCase handler with odd capitalization (`onDblclick`) | `capitalization` / `nonstandard`, as in version 1 | autofix |

The version-1 advice to prefix attributes with `attr:` is gone: 2.0 removed `attr:`. On components,
`on*` are ordinary props and aren't checked. `recommended-v2` sets this rule to `error`, since most
of its version-2 reports are runtime bugs.
