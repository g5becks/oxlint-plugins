/**
 * Rule: no-throw-errorset
 *
 * Disallows throwing errorset values. They are return values, not exceptions.
 *
 * ❌ throw UserError.not_found`User ${"id"} not found`({ id })
 * ✅ return UserError.not_found`User ${"id"} not found`({ id })
 */
import { createErrorsetImportTracker } from "../utils/detect-errorset-imports.ts"
import {
    getEnclosingFunction,
    getErrorsetTag,
    getMemberObjectName,
    CAPTURE_METHODS,
} from "../utils/pattern-helpers.ts"

/**
 * Returns true when the ThrowStatement's argument is an errorset creation expression
 * (either a tagged template or a call wrapping a tagged template).
 */
function getCreationObjectName(node: any, guardNames: Set<string>): string | null {
    let candidate = node.argument
    if (!candidate) return null

    // Pattern A: throw SomeError.kind`...`(data) — CallExpression wrapping TTE
    if (
        candidate.type === "CallExpression" &&
        candidate.callee?.type === "TaggedTemplateExpression"
    ) {
        candidate = candidate.callee
    }

    // Pattern B: throw SomeError.kind`...` — bare TaggedTemplateExpression
    if (candidate.type !== "TaggedTemplateExpression") return null

    const tag = getErrorsetTag(candidate)
    const objName = getMemberObjectName(tag)
    if (!objName) return null
    return guardNames.has(objName) ? objName : null
}

/**
 * Returns true when the node is inside the first argument (the target function)
 * of a .capture() or .captureAsync() call — those throw intentionally.
 */
function isInsideCaptureTarget(node: any, guardNames: Set<string>): boolean {
    let current = node?.parent
    while (current) {
        if (
            current.type === "CallExpression" &&
            current.callee?.type === "MemberExpression" &&
            CAPTURE_METHODS.has(current.callee.property?.name) &&
            current.callee.object?.type === "Identifier" &&
            guardNames.has(current.callee.object.name)
        ) {
            // We're inside a .capture() call — check if we're in the first arg (target fn)
            const firstArg = current.arguments?.[0]
            if (
                firstArg &&
                (firstArg.type === "ArrowFunctionExpression" ||
                    firstArg.type === "FunctionExpression")
            ) {
                // Check if the current node's ancestry includes this firstArg
                let inner = node?.parent
                while (inner && inner !== current) {
                    if (inner === firstArg) return true
                    inner = inner.parent
                }
            }
        }
        current = current.parent
    }
    return false
}

export default {
    meta: {
        type: "problem" as const,
        docs: {
            description:
                "Disallow throwing errorset values. Errorset values are return values, not exceptions. Use `return` instead of `throw`.",
            recommended: "error",
        },
        fixable: "code" as const,
        schema: [],
        messages: {
            noThrow:
                "Do not throw errorset values. Return them instead: return {{name}}.{{kind}}(...)",
            noThrowGeneric:
                "Do not throw errorset values. Errorset values are returned, not thrown.",
        },
    },
    defaultOptions: [],
    createOnce(context: any) {
        const tracker = createErrorsetImportTracker()

        return {
            before() {
                tracker.reset()
            },
            Program() {
                tracker.reset()
            },
            ImportDeclaration(node: any) {
                tracker.handleImportDeclaration(node)
            },
            VariableDeclaration(node: any) {
                tracker.handleVariableDeclaration(node)
            },
            ThrowStatement(node: any) {
                if (!tracker.hasErrorsetImport()) return
                const guardNames = tracker.guardNames()
                if (guardNames.size === 0) return

                // Don't report inside .capture() target function args
                if (isInsideCaptureTarget(node, guardNames)) return

                const objName = getCreationObjectName(node, guardNames)
                if (!objName) return

                // Extract kind name for the message
                let kindName = "kind"
                let argument = node.argument
                if (
                    argument?.type === "CallExpression" &&
                    argument.callee?.type === "TaggedTemplateExpression"
                ) {
                    argument = argument.callee
                }
                if (
                    argument?.type === "TaggedTemplateExpression" &&
                    argument.tag?.type === "MemberExpression" &&
                    argument.tag.property?.type === "Identifier"
                ) {
                    kindName = argument.tag.property.name
                }

                const enclosingFn = getEnclosingFunction(node)
                const canAutoFix = enclosingFn !== null

                context.report({
                    node,
                    messageId: "noThrow",
                    data: { name: objName, kind: kindName },
                    fix: canAutoFix
                        ? (fixer: any) => {
                            const sourceCode = context.sourceCode
                            const argText = sourceCode.getText(node.argument)
                            // Preserve the trailing semicolon if present in the source.
                            // The ThrowStatement node range may not include the semicolon
                            // (depends on the parser), so we check the character after the node.
                            const nodeText = sourceCode.getText(node)
                            const trailingSemi = nodeText.endsWith(";") ? ";" : ""
                            return fixer.replaceText(node, `return ${argText}${trailingSemi}`)
                        }
                        : undefined,
                })
            },
        }
    },
}
