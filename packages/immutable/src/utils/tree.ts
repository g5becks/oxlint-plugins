import type { ESTree } from "@oxlint/plugins";

type FunctionNode = ESTree.Function | ESTree.ArrowFunctionExpression;

export function getEnclosingFunction(node: ESTree.Node | null | undefined): FunctionNode | null {
  let current = node?.parent;
  while (current != null) {
    if (
      current.type === "FunctionDeclaration" ||
      current.type === "FunctionExpression" ||
      current.type === "ArrowFunctionExpression"
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

export function isInFunctionBody(node: ESTree.Node, fn: FunctionNode | null | undefined): boolean {
  if (!fn?.body) {
    return false;
  }
  let current: ESTree.Node | null = node;
  while (current != null) {
    if (current === fn.body) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export function isInForLoopInitializer(node: ESTree.Node | null | undefined): boolean {
  const parent = node?.parent;
  if (parent?.type === "ForStatement") {
    return parent.init === node;
  }
  if (parent?.type === "ForInStatement" || parent?.type === "ForOfStatement") {
    return parent.left === node;
  }
  return false;
}
