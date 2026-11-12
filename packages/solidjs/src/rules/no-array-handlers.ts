import { defineRule } from "@oxlint/plugins";
import { isDOMElementName } from "../utils/jsx.ts";
import { trace } from "../utils/trace.ts";
import { cannotContainJSX } from "../utils/files.ts";

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description: "Disallow usage of type-unsafe event handlers.",
      recommended: "warn",
    },
    schema: [],
    messages: {
      noArrayHandlers: "Passing an array as an event handler is potentially type-unsafe.",
    },
  },
  createOnce(context) {
    return {
      // JSX-only rule: skip files that can't contain JSX (audit P3).
      before() {
        return !cannotContainJSX(context.filename);
      },
      JSXAttribute(node) {
        const openingElement = node.parent;
        if (
          openingElement.type !== "JSXOpeningElement" ||
          openingElement.name.type !== "JSXIdentifier" ||
          !isDOMElementName(openingElement.name.name)
        ) {
          return;
        }

        const isNamespacedHandler = node.name.type === "JSXNamespacedName" && node.name.namespace.name === "on";
        const isNormalEventHandler = node.name.type === "JSXIdentifier" && /^on[a-zA-Z]/.test(node.name.name);

        if (
          (isNamespacedHandler || isNormalEventHandler) &&
          node.value?.type === "JSXExpressionContainer" &&
          trace(node.value.expression, context)?.type === "ArrayExpression"
        ) {
          context.report({ node, messageId: "noArrayHandlers" });
        }
      },
    };
  },
});
