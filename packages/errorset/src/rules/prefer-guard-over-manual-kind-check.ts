/**
 * Rule: prefer-guard-over-manual-kind-check
 *
 * Warns when `.kind === "literal"` is used to check an errorset value
 * instead of the kind-level guard function `SomeError.kind(value)`.
 * Manual kind checks lose TypeScript's type narrowing for `.data`.
 *
 * ❌ if (result.kind === "not_found") { result.data.id }  // data is Record<string, unknown>
 * ✅ if (UserError.not_found(result)) { result.data.id }  // data is { id: string }
 */
import { createErrorsetImportTracker } from "../utils/detect-errorset-imports.ts"
import {
    getKindEquality,
    findAncestor,
    isGuardCall,
    isIsErrCall,
} from "../utils/pattern-helpers.ts"

/**
 * Returns true when the given variable identifier appears as the subject of a
 * guard call or isErr() call in an ancestor if/ternary condition.
 * This limits the rule to cases where the value is already known to be an error.
 */
function isAlreadyGuardedVariable(
    identifierNode: any,
    guardNames: Set<string>,
    isIsErrName: (n: string) => boolean
): boolean {
    if (!identifierNode || identifierNode.type !== "Identifier") return false
    const varName = identifierNode.name

    // Walk up to find an IfStatement or ConditionalExpression whose test
    // contains a guard call for the same variable.
    const ifAncestor = findAncestor(identifierNode, (n) => {
        if (n.type !== "IfStatement" && n.type !== "ConditionalExpression") return false
        const test = n.test
        // isErr(varName)
        if (
            isIsErrCall(test, isIsErrName) &&
            test.arguments?.[0]?.type === "Identifier" &&
            test.arguments[0].name === varName
        ) {
            return true
        }
        // UserError(varName) or UserError.kind(varName)
        if (
            isGuardCall(test, guardNames) &&
            test.arguments?.[0]?.type === "Identifier" &&
            test.arguments[0].name === varName
        ) {
            return true
        }
        return false
    })

    return ifAncestor !== null
}

export default {
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Prefer errorset kind-level guard functions over manual `.kind === \"...\"` checks. Guards provide TypeScript type narrowing for `.data`.",
            recommended: "warn",
        },
        hasSuggestions: true,
        schema: [],
        messages: {
            preferGuard:
                "Use the kind-level guard `{{guardName}}.{{kind}}({{varName}})` instead of `{{varName}}.kind === \"{{kind}}\"`.",
            preferGuardUnknown:
                "Use a kind-level guard instead of `.kind === \"{{kindLiteral}}\"`. Manual kind checks don't provide TypeScript type narrowing for `.data`.",
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
            BinaryExpression(node: any) {
                if (!tracker.hasErrorsetImport()) return

                const equality = getKindEquality(node)
                if (!equality) return

                const { object, kindLiteral } = equality
                const guardNames = tracker.guardNames()

                // Only report when the variable is inside an if-test that already confirmed
                // it's an error via isErr() or a set-level guard — conservative mode.
                if (!isAlreadyGuardedVariable(object, guardNames, (n) => tracker.isIsErrImport(n))) {
                    return
                }

                // Try to find which error set owns this kind
                const varName = object?.type === "Identifier" ? object.name : null

                // Look for a guard name that could plausibly own this kind
                // (we can't know for sure without type info, so emit a suggestion)
                const [firstGuard] = guardNames // best guess: first guard in file
                const guardName = firstGuard ?? null

                if (guardName && varName) {
                    const sourceCode = context.sourceCode
                    context.report({
                        node,
                        messageId: "preferGuard",
                        data: { guardName, kind: kindLiteral, varName },
                        suggest: [
                            {
                                messageId: "preferGuard",
                                data: { guardName, kind: kindLiteral, varName },
                                fix(fixer: any) {
                                    return fixer.replaceText(
                                        node,
                                        `${guardName}.${kindLiteral}(${sourceCode.getText(object)})`
                                    )
                                },
                            },
                        ],
                    })
                } else {
                    context.report({
                        node,
                        messageId: "preferGuardUnknown",
                        data: { kindLiteral },
                    })
                }
            },
        }
    },
}
