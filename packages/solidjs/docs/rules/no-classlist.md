# solidjs/no-classlist

Disallows `classList` on native elements. Solid 2.0 removes it and merges its behavior into `class`,
which takes a string, an object (class name → truthy) or an array of both.

**Version 2 only:** the rule reports nothing unless `settings.solidjs.version` is `2`.

Sources: MIGRATION §classList → class (object/array forms); RFC 07 §Enhanced class prop
([solidjs/solid@cd201ce](https://github.com/solidjs/solid/tree/cd201ce390e234c46a6d29e8689364e26a14eccb/documentation/solid-2.0)).
The 2.0 compiler rejects `classList` on a native element (MIGRATION §Attributes & events), so this
rule mostly helps in the editor. On components `classList` is an ordinary prop and isn't reported.

## Autofix

The guide's before/after:

| Before | After |
|---|---|
| `<div classList={{ active: on() }} />` | `<div class={{ active: on() }} />` |
| `<div class="card" classList={{ active: on() }} />` | `<div class={["card", { active: on() }]} />` |
| `<div class={props.class} classList={flags()} />` | `<div class={[props.class, flags()]} />` |
| `<div class={["a", b()]} classList={flags()} />` | `<div class={["a", b(), flags()]} />` |

A JSX string value is re-quoted as a JavaScript string, so quotes and backslashes survive.

**No fix:** a spread on the element (it may carry a `class`), two `classList` or two `class` props,
a `class` without a value, or a `classList` whose value isn't an expression.

Replaces the retired [`prefer-classlist`](prefer-classlist.md) at version 2.
