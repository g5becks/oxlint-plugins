import { defineRule, type ESTree } from "@oxlint/plugins";
import { isJSXElementOrFragment } from "../utils/jsx.ts";
import { type FunctionNode, isFunctionNode } from "../utils/functions.ts";

function getPropertyName(memberExpr: ESTree.MemberExpression): string | null {
  if (!memberExpr?.property) return null;
  if (!memberExpr.computed && memberExpr.property.type === "Identifier") {
    return memberExpr.property.name;
  }
  if (memberExpr.property.type === "Literal" && typeof memberExpr.property.value === "string") {
    return memberExpr.property.value;
  }
  return null;
}

export default defineRule({
  meta: {
    type: "problem" as const,
    docs: {
      description: "Enforce using Solid's `<For />` component for mapping an array to JSX elements.",
      recommended: "warn",
    },
    fixable: "code" as const,
    schema: [],
    messages: {
      preferFor:
        "Use Solid's `<For />` component for efficiently rendering lists. Array#map causes DOM elements to be recreated.",
      preferForOrIndex:
        "Use Solid's `<For />` component or `<Index />` component for rendering lists. Array#map causes DOM elements to be recreated.",
    },
  },
  createOnce(context) {
    const reportPreferFor = (node: ESTree.CallExpression, callee: ESTree.MemberExpression, mapFnNode: ESTree.Node) => {
      const jsxExpressionContainerNode = node.parent;
      const arrayNode = callee.object;
      context.report({
        node,
        messageId: "preferFor",
        fix: (fixer) => {
          const beforeArray: [number, number] = [jsxExpressionContainerNode.range[0], arrayNode.range[0]];
          const betweenArrayAndMapFn: [number, number] = [arrayNode.range[1], mapFnNode.range[0]];
          const afterMapFn: [number, number] = [mapFnNode.range[1], jsxExpressionContainerNode.range[1]];
          return [
            fixer.replaceTextRange(beforeArray, "<For each={"),
            fixer.replaceTextRange(betweenArrayAndMapFn, "}>{"),
            fixer.replaceTextRange(afterMapFn, "}</For>"),
          ];
        },
      });
    };

    return {
      CallExpression(node) {
        const callOrChain: ESTree.Node = node.parent.type === "ChainExpression" ? node.parent : node;
        if (
          callOrChain.parent?.type === "JSXExpressionContainer" &&
          isJSXElementOrFragment(callOrChain.parent.parent)
        ) {
          if (
            node.callee.type === "MemberExpression" &&
            getPropertyName(node.callee) === "map" &&
            node.arguments.length === 1 &&
            isFunctionNode(node.arguments[0])
          ) {
            const mapFnNode = node.arguments[0] as FunctionNode; // isFunctionNode checked above
            if (mapFnNode.params.length === 1 && mapFnNode.params[0]?.type !== "RestElement") {
              reportPreferFor(node, node.callee, mapFnNode);
            } else {
              context.report({ node, messageId: "preferForOrIndex" });
            }
          }
        }
      },
    };
  },
});
