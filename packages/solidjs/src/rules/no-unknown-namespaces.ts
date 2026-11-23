import { defineRule, type ESTree, type Fixer } from "@oxlint/plugins";
import { isDOMElementName } from "../utils/jsx.ts";
import { ruleOptions } from "../utils/options.ts";
import { cannotContainJSX } from "../utils/files.ts";
import { readSolidVersion } from "../utils/settings.ts";
import { COMMON_EVENTS_MAP } from "./event-handlers.ts";

const knownNamespaces = ["on", "oncapture", "use", "prop", "attr", "bool"];
const styleNamespaces = ["style", "class"];
const otherNamespaces = ["xmlns", "xlink"];
/** Solid 2.0: only `prop:` and the XML namespaces (MIGRATION §Attributes & events; RFC 07). */
const namespacesV2 = ["prop", "xmlns", "xlink", "xml"];

/** `click` → `onClick`, `pointerdown` → `onPointerDown` (the camelCase handler for an event name). */
const handlerName = (event: string): string =>
  COMMON_EVENTS_MAP.get(`on${event.toLowerCase()}`) ?? `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Enforce using only Solid-specific namespaced attribute names (i.e. `'on:'` in `<div on:click={...} />`).",
      recommended: "error",
      url: "https://github.com/g5becks/oxlint-plugins/blob/main/packages/solidjs/docs/rules/no-unknown-namespaces.md",
    },
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          allowedNamespaces: {
            description: "an array of additional namespace names to allow",
            type: "array",
            items: { type: "string" },
            minItems: 1,
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unknown: `'{{namespace}}:' is not one of Solid's special prefixes for JSX attributes (${knownNamespaces
        .map((n) => `'${n}:'`)
        .join(", ")}).`,
      style:
        "Using the '{{namespace}}:' special prefix is potentially confusing, prefer the '{{namespace}}' prop instead.",
      component: "Namespaced props have no effect on components.",
      "component-suggest": "Replace {{namespace}}:{{name}} with {{name}}.",
      unknownV2: "'{{namespace}}:' is not a namespace Solid 2.0 supports ('prop:', 'xmlns:', 'xlink:', 'xml:').",
      removedOn:
        "`{{namespace}}:{{name}}` is removed in Solid 2.0. Use the camelCase handler `{{handler}}`, or for listener options such as capture, a ref callback that calls addEventListener.",
      removedAttr:
        "`{{namespace}}:{{name}}` is removed in Solid 2.0. Write the plain attribute `{{name}}`; booleans add or remove it.",
      removedUse: "`use:{{name}}` is removed in Solid 2.0. Use a ref directive factory: `{{replacement}}`.",
      suggestReplace: "Replace with `{{replacement}}`.",
    },
  },
  createOnce(context) {
    // Version 2 (TASK-051): the removed namespaces report their 2.0 replacement.
    const checkV2 = (node: ESTree.JSXNamespacedName, namespace: string, allowed: string[] | undefined) => {
      if (namespacesV2.includes(namespace) || allowed?.includes(namespace)) return;
      const name = node.name.name;
      const attribute = node.parent as ESTree.JSXAttribute;
      const sourceCode = context.sourceCode;
      const suggest = (replacement: string, range: ESTree.Node = attribute.name) => [
        {
          messageId: "suggestReplace" as const,
          data: { replacement },
          fix: (fixer: Fixer) => fixer.replaceText(range, replacement),
        },
      ];
      if (namespace === "on" || namespace === "oncapture") {
        const handler = handlerName(name);
        context.report({
          node,
          messageId: "removedOn",
          data: { namespace, name, handler },
          // oncapture: loses its capture phase as a plain handler, so no suggestion there.
          ...(namespace === "on" ? { suggest: suggest(handler) } : {}),
        });
      } else if (namespace === "attr" || namespace === "bool") {
        context.report({ node, messageId: "removedAttr", data: { namespace, name }, suggest: suggest(name) });
      } else if (namespace === "use") {
        const value = attribute.value;
        const arg =
          value?.type === "JSXExpressionContainer" && value.expression.type !== "JSXEmptyExpression"
            ? sourceCode.getText(value.expression)
            : null;
        const replacement = value === null ? `ref={${name}}` : arg !== null ? `ref={${name}(${arg})}` : null;
        const opening = attribute.parent as ESTree.JSXOpeningElement;
        const hasRef = opening.attributes.some(
          (a) => a.type === "JSXAttribute" && a.name.type === "JSXIdentifier" && a.name.name === "ref",
        );
        context.report({
          node,
          messageId: "removedUse",
          data: { name, replacement: replacement ?? `ref={${name}(...)}` },
          ...(replacement && !hasRef ? { suggest: suggest(replacement, attribute) } : {}),
        });
      } else if (styleNamespaces.includes(namespace)) {
        context.report({ node, messageId: "style", data: { namespace } });
      } else {
        context.report({ node, messageId: "unknownV2", data: { namespace } });
      }
    };

    return {
      // JSX-only rule: skip files that can't contain JSX (audit P3).
      before() {
        return !cannotContainJSX(context.filename);
      },
      "JSXAttribute > JSXNamespacedName"(node) {
        if (node.type !== "JSXNamespacedName") return; // guaranteed by the selector
        const explicitlyAllowedNamespaces = ruleOptions<{ allowedNamespaces?: Array<string> }>(
          context,
        )?.allowedNamespaces;
        const openingElement = node.parent.parent;
        if (
          openingElement?.type === "JSXOpeningElement" &&
          openingElement.name.type === "JSXIdentifier" &&
          !isDOMElementName(openingElement.name.name)
        ) {
          context.report({
            node,
            messageId: "component",
            suggest: [
              {
                messageId: "component-suggest",
                data: { namespace: node.namespace.name, name: node.name.name },
                fix: (fixer) => fixer.replaceText(node, node.name.name),
              },
            ],
          });
          return;
        }

        const namespace = node.namespace.name;
        if (readSolidVersion(context) === 2) {
          checkV2(node, namespace, explicitlyAllowedNamespaces);
          return;
        }
        if (
          !(
            knownNamespaces.includes(namespace) ||
            otherNamespaces.includes(namespace) ||
            explicitlyAllowedNamespaces?.includes(namespace)
          )
        ) {
          if (styleNamespaces.includes(namespace)) {
            context.report({
              node,
              messageId: "style",
              data: { namespace },
            });
          } else {
            context.report({
              node,
              messageId: "unknown",
              data: { namespace },
            });
          }
        }
      },
    };
  },
});
