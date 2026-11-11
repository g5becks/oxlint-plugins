export function getEnclosingFunction(node: any): any | null {
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

export function isInFunctionBody(node: any, fn: any): boolean {
  if (!fn?.body) {
    return false;
  }
  let current = node;
  while (current != null) {
    if (current === fn.body) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export function isInForLoopInitializer(node: any): boolean {
  const parent = node?.parent;
  if (parent?.type === "ForStatement") {
    return parent.init === node;
  }
  if (parent?.type === "ForInStatement" || parent?.type === "ForOfStatement") {
    return parent.left === node;
  }
  return false;
}
