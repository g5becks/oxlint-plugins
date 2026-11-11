function uniqueBy<T>(arr: Array<T>, fn: (x: T) => unknown): Array<T> {
  return arr.filter((x, i, a) => a.findIndex((y) => fn(x) === fn(y)) === i);
}

function isIdentifier(node: any): node is { type: "Identifier"; name: string } {
  return node?.type === "Identifier";
}

function isProperty(node: any): node is { type: "Property"; key: any; value: any } {
  return node?.type === "Property";
}

function isObjectExpression(node: any): node is { type: "ObjectExpression"; properties: Array<any> } {
  return node?.type === "ObjectExpression";
}

function isIdentifierWithName(node: any, name: string): boolean {
  return isIdentifier(node) && node.name === name;
}

function findPropertyWithIdentifierKey(properties: Array<any>, key: string): any | undefined {
  return properties.find((x) => isProperty(x) && isIdentifierWithName(x.key, key));
}

function getNestedIdentifiers(node: any): Array<any> {
  const identifiers: Array<any> = [];

  if (!node || typeof node !== "object") {
    return identifiers;
  }

  if (isIdentifier(node)) {
    identifiers.push(node);
  }

  if (Array.isArray(node.arguments)) {
    for (const x of node.arguments) {
      identifiers.push(...getNestedIdentifiers(x));
    }
  }

  if (Array.isArray(node.elements)) {
    for (const x of node.elements) {
      if (x != null) {
        identifiers.push(...getNestedIdentifiers(x));
      }
    }
  }

  if (Array.isArray(node.properties)) {
    for (const x of node.properties) {
      identifiers.push(...getNestedIdentifiers(x));
    }
  }

  if (Array.isArray(node.expressions)) {
    for (const x of node.expressions) {
      identifiers.push(...getNestedIdentifiers(x));
    }
  }

  if (node.left) {
    identifiers.push(...getNestedIdentifiers(node.left));
  }

  if (node.right) {
    identifiers.push(...getNestedIdentifiers(node.right));
  }

  if (node.type === "Property") {
    identifiers.push(...getNestedIdentifiers(node.value));
  }

  if (node.type === "SpreadElement") {
    identifiers.push(...getNestedIdentifiers(node.argument));
  }

  if (node.type === "MemberExpression") {
    identifiers.push(...getNestedIdentifiers(node.object));
  }

  if (node.type === "UnaryExpression") {
    identifiers.push(...getNestedIdentifiers(node.argument));
  }

  if (node.type === "ChainExpression") {
    identifiers.push(...getNestedIdentifiers(node.expression));
  }

  if (node.type === "TSNonNullExpression") {
    identifiers.push(...getNestedIdentifiers(node.expression));
  }

  if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
    identifiers.push(...getNestedIdentifiers(node.body));
  }

  if (node.type === "BlockStatement") {
    for (const bodyNode of node.body ?? []) {
      identifiers.push(...getNestedIdentifiers(bodyNode));
    }
  }

  if (node.type === "ReturnStatement" && node.argument) {
    identifiers.push(...getNestedIdentifiers(node.argument));
  }

  return identifiers;
}

function traverseUpOnly(identifier: any, allowedNodeTypes: Array<string>): any {
  const parent = identifier?.parent;
  if (parent && allowedNodeTypes.includes(parent.type)) {
    return traverseUpOnly(parent, allowedNodeTypes);
  }
  return identifier;
}

function isAncestorIsCallee(identifier: any): boolean {
  let previousNode = identifier;
  let currentNode = identifier?.parent;

  while (currentNode) {
    if (currentNode.type === "CallExpression" && currentNode.callee === previousNode) {
      return true;
    }

    if (currentNode.type !== "MemberExpression") {
      return false;
    }

    previousNode = currentNode;
    currentNode = currentNode.parent;
  }

  return false;
}

function getExternalRefs(params: { scopeManager: any; sourceCode: any; node: any }): Array<any> {
  const { scopeManager, sourceCode, node } = params;
  const scope = scopeManager?.acquire?.(node);

  if (!scope) {
    return [];
  }

  const references = (scope.references ?? [])
    .filter((x: any) => x.isRead?.() && !scope.set?.has?.(x.identifier.name))
    .map((x: any) => {
      const referenceNode = traverseUpOnly(x.identifier, ["MemberExpression", "Identifier"]);
      return {
        variable: x,
        node: referenceNode,
        text: sourceCode.getText(referenceNode),
      };
    });

  const localRefIds = new Set(
    [...(scope.set?.values?.() ?? [])].map((x: any) => sourceCode.getText(x.identifiers[0])),
  );

  const externalRefs = references.filter((x: any) => x.variable.resolved == null || !localRefIds.has(x.text));

  return uniqueBy(externalRefs, (x) => x.text).map((x: any) => x.variable);
}

function mapKeyNodeToText(node: any, sourceCode: any): string {
  return sourceCode.getText(
    traverseUpOnly(node, ["MemberExpression", "TSNonNullExpression", "Identifier"]),
  );
}

function mapKeyNodeToBaseText(node: any, sourceCode: any): string {
  return mapKeyNodeToText(node, sourceCode).replace(/(?:\?(\.)|!)/g, "$1");
}

function isValidReactComponentOrHookName(identifier: any): boolean {
  return !!identifier?.name && /^(use|[A-Z])/.test(identifier.name);
}

function getFunctionAncestor(sourceCode: any, node: any): any | undefined {
  for (const ancestor of sourceCode.getAncestors?.(node) ?? []) {
    if (["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(ancestor.type)) {
      return ancestor;
    }
  }

  return undefined;
}

function isDeclaredInNode(params: { functionNode: any; reference: any; scopeManager: any }): boolean {
  const { functionNode, reference, scopeManager } = params;
  const scope = scopeManager?.acquire?.(functionNode);
  if (!scope) {
    return false;
  }
  return scope.set?.has?.(reference.identifier.name) ?? false;
}

function getReferencedExpressionByIdentifier(params: { node: any; context: any }): any | null {
  const { node, context } = params;
  const sourceCode = context.sourceCode ?? context.getSourceCode();
  const scope = sourceCode.getScope?.(node) ?? context.getScope?.();

  const resolvedNode = scope?.references
    ?.find((ref: any) => ref.identifier === node)
    ?.resolved?.defs?.[0]?.node;

  if (resolvedNode?.type !== "VariableDeclarator") {
    return null;
  }

  return resolvedNode.init;
}

export const ASTUtils = {
  isIdentifier,
  isProperty,
  isObjectExpression,
  isIdentifierWithName,
  findPropertyWithIdentifierKey,
  getNestedIdentifiers,
  traverseUpOnly,
  isAncestorIsCallee,
  getExternalRefs,
  mapKeyNodeToText,
  mapKeyNodeToBaseText,
  isValidReactComponentOrHookName,
  getFunctionAncestor,
  isDeclaredInNode,
  getReferencedExpressionByIdentifier,
};
