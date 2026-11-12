import { defineRule } from "@oxlint/plugins";
export default defineRule({
  meta: {
    type: "suggestion" as const,
    docs: {
      description: "Disallow Promise.reject and reject callbacks.",
      recommended: false,
    },
    schema: [],
    messages: {
      generic: "Unexpected rejection, resolve an error instead.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          node.callee.object.name === "Promise" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "reject"
        ) {
          context.report({ node, messageId: "generic" });
        }
      },
      NewExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "Promise") {
          return;
        }

        const firstArg = node.arguments[0];
        if (
          (firstArg?.type === "ArrowFunctionExpression" || firstArg?.type === "FunctionExpression") &&
          firstArg.params[1]
        ) {
          context.report({ node: firstArg.params[1], messageId: "generic" });
        }
      },
    };
  },
});
