import type { ESTree } from "@oxlint/plugins";

export type FunctionNode = ESTree.Function | ESTree.ArrowFunctionExpression;

/** Function declarations, function expressions and arrow functions. */
export function isFunctionNode(node: ESTree.Node | null | undefined): node is FunctionNode {
  return (
    node?.type === "FunctionDeclaration" ||
    node?.type === "FunctionExpression" ||
    node?.type === "ArrowFunctionExpression"
  );
}
