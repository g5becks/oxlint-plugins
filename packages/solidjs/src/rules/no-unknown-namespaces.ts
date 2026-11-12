import { defineRule } from "@oxlint/plugins";
import { isDOMElementName } from "../utils/jsx.ts";
import { ruleOptions } from "../utils/options.ts";

const knownNamespaces = ["on", "oncapture", "use", "prop", "attr", "bool"];
const styleNamespaces = ["style", "class"];
const otherNamespaces = ["xmlns", "xlink"];

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description:
        "Enforce using only Solid-specific namespaced attribute names (i.e. `'on:'` in `<div on:click={...} />`).",
      recommended: "error",
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
    },
  },
  createOnce(context) {
    return {
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
