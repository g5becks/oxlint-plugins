import type { Context, ESTree, Reference, ScopeManager, SourceCode } from "@oxlint/plugins";

function uniqueBy<T>(arr: Array<T>, fn: (x: T) => unknown): Array<T> {
  return arr.filter((x, i, a) => a.findIndex((y) => fn(x) === fn(y)) === i);
}

type Child = ESTree.Node | null | undefined;
type IdentifierNode = Extract<ESTree.Node, { type: "Identifier" }>;
type FunctionNode = ESTree.Function | ESTree.ArrowFunctionExpression;

/** Field access by name, for the structural walk below (upstream checks fields by presence). */
function fields(node: ESTree.Node): Readonly<Record<string, unknown>> {
  return node as unknown as Readonly<Record<string, unknown>>;
}

function isIdentifier(node: Child): node is IdentifierNode {
  return node?.type === "Identifier";
}

function isProperty(node: Child): node is ESTree.ObjectProperty {
  return node?.type === "Property";
}

function isObjectExpression(node: Child): node is ESTree.ObjectExpression {
  return node?.type === "ObjectExpression";
}

function isIdentifierWithName(node: Child, name: string): boolean {
  return isIdentifier(node) && node.name === name;
}

function findPropertyWithIdentifierKey(
  properties: ReadonlyArray<ESTree.Node>,
  key: string,
): ESTree.ObjectProperty | undefined {
  return properties.find((x): x is ESTree.ObjectProperty => isProperty(x) && isIdentifierWithName(x.key, key));
}

function getNestedIdentifiers(node: Child): Array<IdentifierNode> {
  const identifiers: Array<IdentifierNode> = [];

  if (!node || typeof node !== "object") {
    return identifiers;
  }

  if (isIdentifier(node)) {
    identifiers.push(node);
  }

  const f = fields(node);
  const list = (key: string): Array<Child> => (Array.isArray(f[key]) ? (f[key] as Array<Child>) : []);

  for (const x of list("arguments")) {
    identifiers.push(...getNestedIdentifiers(x));
  }

  for (const x of list("elements")) {
    if (x != null) {
      identifiers.push(...getNestedIdentifiers(x));
    }
  }

  for (const x of list("properties")) {
    identifiers.push(...getNestedIdentifiers(x));
  }

  for (const x of list("expressions")) {
    identifiers.push(...getNestedIdentifiers(x));
  }

  if (f.left) {
    identifiers.push(...getNestedIdentifiers(f.left as ESTree.Node));
  }

  if (f.right) {
    identifiers.push(...getNestedIdentifiers(f.right as ESTree.Node));
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

function traverseUpOnly(identifier: ESTree.Node, allowedNodeTypes: ReadonlyArray<string>): ESTree.Node {
  const parent = identifier.parent;
  if (parent && allowedNodeTypes.includes(parent.type)) {
    return traverseUpOnly(parent, allowedNodeTypes);
  }
  return identifier;
}

function isAncestorIsCallee(identifier: ESTree.Node): boolean {
  let previousNode: ESTree.Node = identifier;
  let currentNode: ESTree.Node | null = identifier.parent;

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

function getExternalRefs(params: {
  scopeManager: ScopeManager;
  sourceCode: SourceCode;
  node: ESTree.Node;
}): Array<Reference> {
  const { scopeManager, sourceCode, node } = params;
  const scope = scopeManager?.acquire?.(node);

  if (!scope) {
    return [];
  }

  const references = (scope.references ?? [])
    .filter((x) => x.isRead?.() && !scope.set?.has?.(x.identifier.name))
    .map((x) => {
      const referenceNode = traverseUpOnly(x.identifier, ["MemberExpression", "Identifier"]);
      return {
        variable: x,
        node: referenceNode,
        text: sourceCode.getText(referenceNode),
      };
    });

  const localRefIds = new Set([...(scope.set?.values?.() ?? [])].map((x) => sourceCode.getText(x.identifiers[0])));

  const externalRefs = references.filter((x) => x.variable.resolved == null || !localRefIds.has(x.text));

  return uniqueBy(externalRefs, (x) => x.text).map((x) => x.variable);
}

function mapKeyNodeToText(node: ESTree.Node, sourceCode: SourceCode): string {
  return sourceCode.getText(traverseUpOnly(node, ["MemberExpression", "TSNonNullExpression", "Identifier"]));
}

function mapKeyNodeToBaseText(node: ESTree.Node, sourceCode: SourceCode): string {
  return mapKeyNodeToText(node, sourceCode).replace(/(?:\?(\.)|!)/g, "$1");
}

function isValidReactComponentOrHookName(identifier: Child): boolean {
  const name = identifier ? fields(identifier).name : undefined;
  return !!name && /^(use|[A-Z])/.test(name as string);
}

const FUNCTION_TYPES: ReadonlyArray<string> = ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"];

function getFunctionAncestor(sourceCode: SourceCode, node: ESTree.Node): FunctionNode | undefined {
  // getAncestors() is typed with the base `Node`; its elements are AST nodes.
  for (const ancestor of sourceCode.getAncestors(node) as Array<ESTree.Node>) {
    if (FUNCTION_TYPES.includes(ancestor.type)) {
      return ancestor as FunctionNode;
    }
  }

  return undefined;
}

function isDeclaredInNode(params: {
  functionNode: ESTree.Node;
  reference: Reference;
  scopeManager: ScopeManager;
}): boolean {
  const { functionNode, reference, scopeManager } = params;
  const scope = scopeManager?.acquire?.(functionNode);
  if (!scope) {
    return false;
  }
  return scope.set?.has?.(reference.identifier.name) ?? false;
}

function getReferencedExpressionByIdentifier(params: {
  node: ESTree.Node;
  context: Context;
}): ESTree.Expression | null {
  const { node, context } = params;
  const sourceCode = context.sourceCode;
  const scope = sourceCode.getScope(node);

  const resolvedNode = scope?.references?.find((ref) => ref.identifier === node)?.resolved?.defs?.[0]?.node;

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
