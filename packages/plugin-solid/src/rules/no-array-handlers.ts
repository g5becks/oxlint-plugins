import { isDOMElementName } from "../utils/jsx";
import { trace } from "../utils/trace";

export default {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow usage of type-unsafe event handlers.",
      recommended: "warn",
    },
    schema: [],
    messages: {
      noArrayHandlers: "Passing an array as an event handler is potentially type-unsafe.",
    },
  },
  defaultOptions: [],
  createOnce(context: any) {
    return {
      JSXAttribute(node: any) {
        const openingElement = node.parent;
        if (
          openingElement?.name?.type !== "JSXIdentifier" ||
          !isDOMElementName(openingElement.name.name)
        ) {
          return;
        }

        const isNamespacedHandler =
          node.name?.type === "JSXNamespacedName" && node.name.namespace.name === "on";
        const isNormalEventHandler =
          node.name?.type === "JSXIdentifier" && /^on[a-zA-Z]/.test(node.name.name);

        if (
          (isNamespacedHandler || isNormalEventHandler) &&
          node.value?.type === "JSXExpressionContainer" &&
          trace(node.value.expression, context).type === "ArrayExpression"
        ) {
          context.report({ node, messageId: "noArrayHandlers" });
        }
      },
    };
  },
};
