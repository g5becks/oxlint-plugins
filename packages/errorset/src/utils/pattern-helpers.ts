/**
 * Shared AST pattern helpers for plugin-errorset rules.
 */

/**
 * Returns true when the node is a TemplateStringsArray check target —
 * i.e. it's an Array with a .raw property.
 * Used to detect tagged template literals at the AST level.
 */
export function isTaggedTemplateCreation(node: any): boolean {
    // TaggedTemplateExpression: SomeError.kind`...` (no args)
    if (node?.type === "TaggedTemplateExpression") return true
    // CallExpression: SomeError.kind`...`(data) — the callee is a TaggedTemplateExpression
    if (
        node?.type === "CallExpression" &&
        node.callee?.type === "TaggedTemplateExpression"
    ) {
        return true
    }
    return false
}

/**
 * Given a TaggedTemplateExpression or CallExpression(TaggedTemplateExpression),
 * returns the tag MemberExpression if it looks like `ErrorSet.kind`.
 */
export function getErrorsetTag(node: any): any | null {
    let tag: any = null
    if (node?.type === "TaggedTemplateExpression") {
        tag = node.tag
    } else if (
        node?.type === "CallExpression" &&
        node.callee?.type === "TaggedTemplateExpression"
    ) {
        tag = node.callee.tag
    }
    if (!tag) return null
    if (tag.type !== "MemberExpression") return null
    return tag
}

/**
 * Returns the object name from a MemberExpression if the object is an Identifier.
 * e.g. `UserError.not_found` → "UserError"
 */
export function getMemberObjectName(memberExpr: any): string | null {
    if (memberExpr?.type !== "MemberExpression") return null
    if (memberExpr.object?.type !== "Identifier") return null
    return memberExpr.object.name ?? null
}

/**
 * Returns true when the call expression is a guard call:
 *   UserError(value)          — set-level guard
 *   UserError.kind(value)     — kind-level guard
 * where `guardNames` identifies the known errorset guards.
 */
export function isGuardCall(node: any, guardNames: Set<string>): boolean {
    if (node?.type !== "CallExpression") return false
    const callee = node.callee
    // Set-level: UserError(value)
    if (callee?.type === "Identifier" && guardNames.has(callee.name)) return true
    // Kind-level: UserError.kind(value)
    if (
        callee?.type === "MemberExpression" &&
        callee.object?.type === "Identifier" &&
        guardNames.has(callee.object.name)
    ) {
        return true
    }
    return false
}

/**
 * Returns true when the expression is an instanceof check against a known errorset:
 *   value instanceof UserError
 */
export function isErrorsetInstanceof(node: any, guardNames: Set<string>): boolean {
    return (
        node?.type === "BinaryExpression" &&
        node.operator === "instanceof" &&
        node.right?.type === "Identifier" &&
        guardNames.has(node.right.name)
    )
}

/**
 * Returns true when the expression is an isErr() call.
 */
export function isIsErrCall(node: any, isIsErrName: (name: string) => boolean): boolean {
    return (
        node?.type === "CallExpression" &&
        node.callee?.type === "Identifier" &&
        isIsErrName(node.callee.name)
    )
}

/**
 * Walk up parent chain to find the nearest ancestor matching predicate.
 */
export function findAncestor(node: any, predicate: (n: any) => boolean): any | null {
    let current = node?.parent
    while (current) {
        if (predicate(current)) return current
        current = current.parent
    }
    return null
}

/**
 * Returns true when the node is inside a CatchClause body.
 */
export function isInsideCatchClause(node: any): boolean {
    return findAncestor(node, (n) => n.type === "CatchClause") !== null
}

/**
 * Returns the nearest function ancestor (any kind).
 */
export function getEnclosingFunction(node: any): any | null {
    return findAncestor(node, (n) =>
        n.type === "FunctionDeclaration" ||
        n.type === "FunctionExpression" ||
        n.type === "ArrowFunctionExpression"
    )
}

/**
 * Returns true when the node is an errorset creation expression:
 *   SomeError.kind`...`        (TaggedTemplateExpression)
 *   SomeError.kind`...`(data)  (CallExpression with TTE callee)
 * and the tag's object is a known guard.
 */
export function isErrorsetCreation(node: any, guardNames: Set<string>): boolean {
    const tag = getErrorsetTag(node)
    if (!tag) return false
    const objName = getMemberObjectName(tag)
    if (!objName) return false
    return guardNames.has(objName)
}

/**
 * Checks if a `.kind === "..."` or `"..." === .kind` binary expression.
 * Returns the object being accessed and the kind literal string, or null.
 */
export function getKindEquality(
    node: any
): { object: any; kindLiteral: string } | null {
    if (node?.type !== "BinaryExpression") return null
    if (node.operator !== "===" && node.operator !== "==" && node.operator !== "!==" && node.operator !== "!=") return null

    let memberExpr: any = null
    let literal: any = null

    // result.kind === "not_found"
    if (
        node.left?.type === "MemberExpression" &&
        node.left.property?.type === "Identifier" &&
        node.left.property.name === "kind" &&
        (node.right?.type === "Literal" || node.right?.type === "StringLiteral")
    ) {
        memberExpr = node.left
        literal = node.right
    }
    // "not_found" === result.kind
    else if (
        node.right?.type === "MemberExpression" &&
        node.right.property?.type === "Identifier" &&
        node.right.property.name === "kind" &&
        (node.left?.type === "Literal" || node.left?.type === "StringLiteral")
    ) {
        memberExpr = node.right
        literal = node.left
    } else {
        return null
    }

    const kindLiteral = typeof literal.value === "string" ? literal.value : null
    if (!kindLiteral) return null

    return { object: memberExpr.object, kindLiteral }
}

/**
 * The property names on Err that indicate the value is being treated as an errorset.
 */
export const ERRORSET_PROPERTIES = new Set(["data", "kind", "message", "cause"])

/**
 * Returns the capture-related method names on an errorset.
 */
export const CAPTURE_METHODS = new Set(["capture", "captureAsync"])
