import { defineRule, type ESTree } from "@oxlint/plugins";
import { cannotContainJSX } from "../utils/files.ts";

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description: "Prevent variables used in JSX from being marked as unused.",
      recommended: "error",
    },
    schema: [],
    messages: {},
  },
  createOnce(context) {
    const markUsed = (name: string, node: ESTree.Node) => {
      context.sourceCode.markVariableAsUsed(name, node);
    };

    return {
      // JSX-only rule: skip files that can't contain JSX (audit P3).
      before() {
        return !cannotContainJSX(context.filename);
      },
      JSXOpeningElement(node) {
        switch (node.name.type) {
          case "JSXNamespacedName":
            return;
          case "JSXIdentifier":
            markUsed(node.name.name, node.name);
            break;
          case "JSXMemberExpression": {
            let parent = node.name.object;
            while (parent?.type === "JSXMemberExpression") {
              parent = parent.object;
            }
            if (parent?.type === "JSXIdentifier") {
              markUsed(parent.name, parent);
            }
            break;
          }
        }
      },
      "JSXAttribute > JSXNamespacedName"(node) {
        if (
          node.type === "JSXNamespacedName" &&
          node.namespace.type === "JSXIdentifier" &&
          node.namespace.name === "use" &&
          node.name.type === "JSXIdentifier"
        ) {
          markUsed(node.name.name, node.name);
        }
      },
    };
  },
});
