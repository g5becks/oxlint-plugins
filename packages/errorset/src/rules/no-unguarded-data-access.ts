/**
 * Rule: no-unguarded-data-access
 *
 * Warns when `.data`, `.kind`, `.message`, or `.cause` is accessed on a variable
 * that is the subject of an errorset guard in an ancestor scope WITHOUT first
 * narrowing via the guard.
 *
 * This is conservative: it only reports when the same variable was previously
 * checked via an isErr()/guard call in the file, then has its properties accessed
 * outside such a guard.
 *
 * ❌ const result = getUser(id)
 *    console.log(result.data.id)   // result is User | UserError — crash if User
 *
 * ✅ const result = getUser(id)
 *    if (UserError(result)) { console.log(result.data.id) }
 */
import { createErrorsetImportTracker } from "../utils/detect-errorset-imports.ts"
import {
    isGuardCall,
    isIsErrCall,
    ERRORSET_PROPERTIES,
} from "../utils/pattern-helpers.ts"

type Options = [{ properties?: string[] }?]

/**
 * Returns true when the node is lexically inside a consequent/alternate
 * block of an if-statement whose test guards the given varName.
 */
function isInsideGuardBlock(
    node: any,
    varName: string,
    guardNames: Set<string>,
    isIsErrName: (n: string) => boolean
): boolean {
    // Walk up the ancestry looking for an IfStatement or ConditionalExpression
    // where the test guards varName.
    let current = node?.parent
    while (current) {
        if (current.type === "IfStatement") {
            const test = current.test
            if (testGuardsVar(test, varName, guardNames, isIsErrName)) {
                // We're inside this if — check we're in the consequent (true branch)
                // where the guard applies.
                let ancestor = node?.parent
                while (ancestor && ancestor !== current) {
                    if (ancestor === current.consequent) return true
                    ancestor = ancestor.parent
                }
            }
        }
        // Stop at function boundaries — a new function context resets narrowing
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

function testGuardsVar(
    test: any,
    varName: string,
    guardNames: Set<string>,
    isIsErrName: (n: string) => boolean
): boolean {
    if (!test) return false
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
    // Logical AND: isErr(x) && ...  or  UserError(x) && ...
    if (test.type === "LogicalExpression" && test.operator === "&&") {
        return (
            testGuardsVar(test.left, varName, guardNames, isIsErrName) ||
            testGuardsVar(test.right, varName, guardNames, isIsErrName)
        )
    }
    return false
}

export default {
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Warn when errorset-related properties (.data, .kind, .message, .cause) are accessed without first narrowing the value via a guard.",
            recommended: "warn",
        },
        fixable: undefined,
        schema: [
            {
                type: "object",
                properties: {
                    properties: {
                        type: "array",
                        items: { type: "string" },
                        description: "Which errorset properties to check. Defaults to [\"data\", \"kind\", \"message\", \"cause\"].",
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            unguardedAccess:
                "Accessing `.{{prop}}` on `{{name}}` without a guard check. Use `if (SomeError({{name}}))` or `if (isErr({{name}}))` before accessing errorset properties.",
        },
    },
    defaultOptions: [{}] as Options,
    createOnce(context: any) {
        const tracker = createErrorsetImportTracker()
        // Variables that appear as the subject of any guard call in this file
        const guardedVarNames = new Set<string>()

        const getTrackedProps = (): Set<string> => {
            const opts = context.options?.[0] as Options[0]
            if (opts?.properties && opts.properties.length > 0) {
                return new Set(opts.properties)
            }
            return ERRORSET_PROPERTIES
        }

        return {
            before() {
                tracker.reset()
                guardedVarNames.clear()
            },
            Program() {
                tracker.reset()
                guardedVarNames.clear()
            },
            ImportDeclaration(node: any) {
                tracker.handleImportDeclaration(node)
            },
            VariableDeclaration(node: any) {
                tracker.handleVariableDeclaration(node)
            },

            // Track all variables that appear as args to guard calls or isErr()
            CallExpression(node: any) {
                if (!tracker.hasErrorsetImport()) return
                const guardNames = tracker.guardNames()

                const arg0 = node.arguments?.[0]
                if (!arg0 || arg0.type !== "Identifier") return

                if (
                    isIsErrCall(node, (n) => tracker.isIsErrImport(n)) ||
                    isGuardCall(node, guardNames)
                ) {
                    guardedVarNames.add(arg0.name)
                }
            },

            MemberExpression(node: any) {
                if (!tracker.hasErrorsetImport()) return
                const guardNames = tracker.guardNames()
                if (guardNames.size === 0 && !tracker.isIsErrImport("isErr")) return

                const prop = node.property
                if (prop?.type !== "Identifier") return

                const trackedProps = getTrackedProps()
                if (!trackedProps.has(prop.name)) return

                // Only care about a known potentially-errorset variable
                if (node.object?.type !== "Identifier") return
                const varName = node.object.name

                // Only report if this variable has been seen as an arg to a guard call
                if (!guardedVarNames.has(varName)) return

                // Report only if NOT inside a guard block
                if (
                    isInsideGuardBlock(
                        node,
                        varName,
                        guardNames,
                        (n) => tracker.isIsErrImport(n)
                    )
                ) {
                    return
                }

                context.report({
                    node,
                    messageId: "unguardedAccess",
                    data: { prop: prop.name, name: varName },
                })
            },
        }
    },
}
