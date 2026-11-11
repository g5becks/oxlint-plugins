/**
 * Rule: no-catch-errorset
 *
 * Disallows using errorset guards inside catch blocks.
 * Errorset values are returned values — they are never thrown, so they can
 * never arrive in a catch clause.
 *
 * ❌ catch (e) { if (isErr(e)) { ... } }
 * ❌ catch (e) { if (UserError(e)) { ... } }
 * ❌ catch (e) { if (e instanceof UserError) { ... } }
 * ❌ catch (e) { if (e.kind === "not_found") { ... } }
 */
import { createErrorsetImportTracker } from "../utils/detect-errorset-imports.ts"
import {
    isGuardCall,
    isErrorsetInstanceof,
    isIsErrCall,
} from "../utils/pattern-helpers.ts"

function isInsideCatch(node: any): boolean {
    let current = node?.parent
    while (current) {
        if (current.type === "CatchClause") return true
        // Stop at function boundaries — nested function inside catch is ok
        if (
            current.type === "FunctionDeclaration" ||
            current.type === "FunctionExpression" ||
            current.type === "ArrowFunctionExpression"
        ) {
            return false
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
                "Disallow using errorset guards inside catch blocks. Errorset values are returned, not thrown, so they can never be caught.",
            recommended: "error",
        },
        fixable: undefined,
        schema: [],
        messages: {
            isErrInCatch:
                "`isErr()` inside a catch block will never match. Errorset values are returned, not thrown. Check the function's return value directly.",
            guardInCatch:
                "`{{name}}(...)` inside a catch block will never match. Errorset values are returned, not thrown. Check the function's return value directly.",
            instanceofInCatch:
                "`instanceof {{name}}` inside a catch block will never match. Errorset values are returned, not thrown. Check the function's return value directly.",
            kindInCatch:
                "Accessing `.kind` on a caught error expecting an errorset is always wrong. Errorset values are returned, not thrown.",
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
            CallExpression(node: any) {
                if (!tracker.hasErrorsetImport()) return
                if (!isInsideCatch(node)) return

                // isErr(e)
                if (isIsErrCall(node, (n) => tracker.isIsErrImport(n))) {
                    context.report({ node, messageId: "isErrInCatch" })
                    return
                }

                // UserError(e) or UserError.kind(e)
                const guardNames = tracker.guardNames()
                if (guardNames.size === 0) return

                if (isGuardCall(node, guardNames)) {
                    const callee = node.callee
                    const name =
                        callee?.type === "Identifier"
                            ? callee.name
                            : callee?.object?.name ?? "ErrorSet"
                    context.report({ node, messageId: "guardInCatch", data: { name } })
                }
            },
            BinaryExpression(node: any) {
                if (!tracker.hasErrorsetImport()) return
                if (!isInsideCatch(node)) return

                const guardNames = tracker.guardNames()

                // value instanceof UserError
                if (isErrorsetInstanceof(node, guardNames)) {
                    const name = node.right?.name ?? "ErrorSet"
                    context.report({ node, messageId: "instanceofInCatch", data: { name } })
                }
            },
            MemberExpression(node: any) {
                // catch (e) { ... e.kind ... }
                if (!tracker.hasErrorsetImport()) return
                if (!isInsideCatch(node)) return
                if (
                    node.property?.type !== "Identifier" ||
                    node.property.name !== "kind"
                ) {
                    return
                }
                // Only report when the object is the catch parameter
                const catchClause = (() => {
                    let current = node?.parent
                    while (current) {
                        if (current.type === "CatchClause") return current
                        if (
                            current.type === "FunctionDeclaration" ||
                            current.type === "FunctionExpression" ||
                            current.type === "ArrowFunctionExpression"
                        ) {
                            return null
                        }
                        current = current.parent
                    }
                    return null
                })()
                if (!catchClause) return
                const paramName = catchClause.param?.name
                if (paramName && node.object?.type === "Identifier" && node.object.name === paramName) {
                    context.report({ node, messageId: "kindInCatch" })
                }
            },
        }
    },
}
