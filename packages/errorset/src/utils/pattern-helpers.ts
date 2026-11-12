/**
 * Shared AST pattern helpers for plugin-errorset rules.
 */
import type { ESTree } from "@oxlint/plugins";

type Child = ESTree.Node | null | undefined;
type FunctionNode = ESTree.Function | ESTree.ArrowFunctionExpression;

/** A node's `name` when it is a string (identifiers), else undefined. */
export function nodeName(node: Child): string | undefined {
  const name = (node as { name?: unknown } | null | undefined)?.name;
  return typeof name === "string" ? name : undefined;
}

/**
 * Returns true when the node is a TemplateStringsArray check target —
 * i.e. it's an Array with a .raw property.
 * Used to detect tagged template literals at the AST level.
 */
/**
 * Unwraps `X.kind\`msg\`.with({ cause })` (errorset >= 0.4 no-context errors with a cause)
 * to the tagged template it is called on; other nodes are returned unchanged.
 */
export function unwrapWith(node: Child): Child {
  if (
    node?.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === "with" &&
    node.callee.object.type === "TaggedTemplateExpression"
  ) {
    return node.callee.object;
  }
  return node;
}

export function isTaggedTemplateCreation(node: Child): boolean {
  node = unwrapWith(node);
  // TaggedTemplateExpression: SomeError.kind`...` (no args)
  if (node?.type === "TaggedTemplateExpression") return true;
  // CallExpression: SomeError.kind`...`(data) — the callee is a TaggedTemplateExpression
  if (node?.type === "CallExpression" && node.callee.type === "TaggedTemplateExpression") {
    return true;
  }
  return false;
}

/**
 * Given a TaggedTemplateExpression or CallExpression(TaggedTemplateExpression),
 * returns the tag MemberExpression if it looks like `ErrorSet.kind`.
 */
export function getErrorsetTag(node: Child): ESTree.MemberExpression | null {
  node = unwrapWith(node);
  let tag: ESTree.Expression | null = null;
  if (node?.type === "TaggedTemplateExpression") {
    tag = node.tag;
  } else if (node?.type === "CallExpression" && node.callee.type === "TaggedTemplateExpression") {
    tag = node.callee.tag;
  }
  if (!tag) return null;
  if (tag.type !== "MemberExpression") return null;
  return tag;
}

/**
 * Returns the object name from a MemberExpression if the object is an Identifier.
 * e.g. `UserError.not_found` → "UserError"
 */
export function getMemberObjectName(memberExpr: Child): string | null {
  if (memberExpr?.type !== "MemberExpression") return null;
  if (memberExpr.object.type !== "Identifier") return null;
  return memberExpr.object.name ?? null;
}

/**
 * Returns true when the call expression is a guard call:
 *   UserError(value)          — set-level guard
 *   UserError.kind(value)     — kind-level guard
 * where `guardNames` identifies the known errorset guards.
 */
export function isGuardCall(node: Child, guardNames: Set<string>, mergedGuards?: Set<string>): boolean {
  if (node?.type !== "CallExpression") return false;
  const callee = node.callee;
  // Set-level: UserError(value), also merged guards: ServiceError(value)
  if (callee.type === "Identifier" && guardNames.has(callee.name)) return true;
  // Kind-level: UserError.kind(value). Set members (recover, inspect, merge, capture,
  // captureAsync, from, kinds) are not kind guards, and merged guards have no kind guards.
  if (
    callee.type === "MemberExpression" &&
    callee.object.type === "Identifier" &&
    guardNames.has(callee.object.name) &&
    !mergedGuards?.has(callee.object.name) &&
    callee.property.type === "Identifier" &&
    !SET_MEMBERS.has(callee.property.name)
  ) {
    return true;
  }
  return false;
}

/**
 * Returns true when the expression is an instanceof check against a known errorset:
 *   value instanceof UserError
 */
export function isErrorsetInstanceof(node: Child, guardNames: Set<string>): boolean {
  return (
    node?.type === "BinaryExpression" &&
    node.operator === "instanceof" &&
    node.right.type === "Identifier" &&
    guardNames.has(node.right.name)
  );
}

/**
 * Returns true when the expression is an isErr() call.
 */
export function isIsErrCall(node: Child, isIsErrName: (name: string) => boolean): boolean {
  return node?.type === "CallExpression" && node.callee.type === "Identifier" && isIsErrName(node.callee.name);
}

/**
 * Walk up parent chain to find the nearest ancestor matching predicate.
 */
export function findAncestor(node: Child, predicate: (n: ESTree.Node) => boolean): ESTree.Node | null {
  let current = node?.parent;
  while (current) {
    if (predicate(current)) return current;
    current = current.parent;
  }
  return null;
}

/**
 * Returns true when the node is inside a CatchClause body.
 */
export function isInsideCatchClause(node: Child): boolean {
  return findAncestor(node, (n) => n.type === "CatchClause") !== null;
}

/**
 * Returns the nearest function ancestor (any kind).
 */
export function getEnclosingFunction(node: Child): FunctionNode | null {
  return findAncestor(
    node,
    (n) => n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression",
  ) as FunctionNode | null;
}

/**
 * Returns true when the node is an errorset creation expression:
 *   SomeError.kind`...`        (TaggedTemplateExpression)
 *   SomeError.kind`...`(data)  (CallExpression with TTE callee)
 * and the tag's object is a known guard.
 */
export function isErrorsetCreation(node: Child, guardNames: Set<string>): boolean {
  const tag = getErrorsetTag(node);
  if (!tag) return false;
  const objName = getMemberObjectName(tag);
  if (!objName) return false;
  return guardNames.has(objName);
}

/**
 * Checks if a `.kind === "..."` or `"..." === .kind` binary expression.
 * Returns the object being accessed and the kind literal string, or null.
 */
export function getKindEquality(node: Child): { object: ESTree.Node; kindLiteral: string } | null {
  if (node?.type !== "BinaryExpression") return null;
  if (node.operator !== "===" && node.operator !== "==" && node.operator !== "!==" && node.operator !== "!=")
    return null;

  let memberExpr: ESTree.MemberExpression;
  let literal: ESTree.Node;
  // "StringLiteral" is the Babel AST name; ESTree parsers (oxlint, ESLint) produce "Literal".
  const isStringNode = (n: ESTree.Node) => n.type === "Literal" || (n.type as string) === "StringLiteral";

  // result.kind === "not_found"
  if (
    node.left.type === "MemberExpression" &&
    node.left.property.type === "Identifier" &&
    node.left.property.name === "kind" &&
    isStringNode(node.right)
  ) {
    memberExpr = node.left;
    literal = node.right;
  }
  // "not_found" === result.kind
  else if (
    node.right.type === "MemberExpression" &&
    node.right.property.type === "Identifier" &&
    node.right.property.name === "kind" &&
    isStringNode(node.left)
  ) {
    memberExpr = node.right;
    literal = node.left;
  } else {
    return null;
  }

  const value = (literal as { value?: unknown }).value;
  const kindLiteral = typeof value === "string" ? value : null;
  if (!kindLiteral) return null;

  return { object: memberExpr.object, kindLiteral };
}

/**
 * The property names on Err that indicate the value is being treated as an errorset.
 */
export const ERRORSET_PROPERTIES = new Set(["data", "kind", "message", "cause"]);

/**
 * Returns the capture-related method names on an errorset.
 */
export const CAPTURE_METHODS = new Set(["capture", "captureAsync"]);

/** Members of an error set (or merged guard) that are not kind guards (errorset RESERVED_KINDS). */
export const SET_MEMBERS = new Set(["recover", "inspect", "merge", "capture", "captureAsync", "kinds", "Type", "from"]);
