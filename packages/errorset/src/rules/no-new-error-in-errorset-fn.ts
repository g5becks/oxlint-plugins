/**
 * Rule: no-new-error-in-errorset-fn
 *
 * Warns when `throw new Error(...)` (or built-in subclasses like TypeError) is used
 * inside a function that already uses errorset — detected heuristically by the
 * presence of errorset creation expressions in the same function body.
 *
 * ❌ function getUser(id: string): User | UserError {
 *      if (!id) throw new Error("id is required")   // ← use UserError.invalid instead
 *    }
 *
 * ✅ function getUser(id: string): User | UserError {
 *      if (!id) return UserError.invalid`id is required`
 *    }
 */
import { createErrorsetImportTracker } from "../utils/detect-errorset-imports.ts"
import {
    isErrorsetCreation,
    getEnclosingFunction,
    CAPTURE_METHODS,
} from "../utils/pattern-helpers.ts"

type Options = [{ allowedBuiltins?: string[] }?]

const BUILT_IN_ERRORS = new Set([
    "Error",
    "TypeError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "URIError",
    "EvalError",
])

export default {
    meta: {
        type: "suggestion" as const,
        docs: {
            description:
                "Warn when `throw new Error(...)` is used inside a function that already uses errorset. Use an errorset kind instead.",
            recommended: "warn",
        },
        fixable: undefined,
        schema: [
            {
                type: "object",
                properties: {
                    allowedBuiltins: {
                        type: "array",
                        items: { type: "string" },
                        description:
                            "Built-in Error subclass names still permitted even inside errorset functions (e.g. [\"TypeError\"] for invariant assertions).",
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            noNewError:
                "Avoid `throw new {{name}}(...)` inside a function that uses errorset. Return an errorset kind value instead.",
        },
    },
    defaultOptions: [{}] as Options,
    createOnce(context: any) {
        const tracker = createErrorsetImportTracker()

        // Per-file: functions that contain at least one errorset creation expression.
        const errorsetFunctions = new Set<any>()

        // Collect pending throw violations. We defer until Program:exit
        // because top-down traversal may visit ThrowStatement BEFORE the
        // TaggedTemplateExpression that proves the function uses errorset.
        const pendingViolations: Array<{ node: any; enclosingFn: any; name: string }> = []

        const getAllowedBuiltins = (): Set<string> => {
            const opts = context.options?.[0] as Options[0]
            const list = opts?.allowedBuiltins ?? []
            return new Set(list)
        }

        return {
            before() {
                tracker.reset()
                errorsetFunctions.clear()
                pendingViolations.length = 0
            },
            Program() {
                tracker.reset()
                errorsetFunctions.clear()
                pendingViolations.length = 0
            },
            ImportDeclaration(node: any) {
                tracker.handleImportDeclaration(node)
            },
            VariableDeclaration(node: any) {
                tracker.handleVariableDeclaration(node)
            },

            // When we see an errorset creation expression, mark the enclosing function.
            TaggedTemplateExpression(node: any) {
                if (!tracker.hasErrorsetImport()) return
                const guardNames = tracker.guardNames()
                if (!isErrorsetCreation(node, guardNames)) return
                const fn = getEnclosingFunction(node)
                if (fn) errorsetFunctions.add(fn)
            },
            CallExpression(node: any) {
                if (!tracker.hasErrorsetImport()) return
                const guardNames = tracker.guardNames()
                if (!isErrorsetCreation(node, guardNames)) return
                const fn = getEnclosingFunction(node)
                if (fn) errorsetFunctions.add(fn)
            },

            ThrowStatement(node: any) {
                if (!tracker.hasErrorsetImport()) return
                // Only care about `throw new SomeError(...)`
                const arg = node.argument
                if (arg?.type !== "NewExpression") return
                const callee = arg.callee
                if (callee?.type !== "Identifier") return
                if (!BUILT_IN_ERRORS.has(callee.name)) return

                // Check allowedBuiltins option
                const allowed = getAllowedBuiltins()
                if (allowed.has(callee.name)) return

                const fn = getEnclosingFunction(node)
                if (!fn) return

                // Is this inside a .capture() target function argument? If so, exempt.
                const parentCall = fn.parent
                if (
                    parentCall?.type === "CallExpression" &&
                    parentCall.callee?.type === "MemberExpression" &&
                    CAPTURE_METHODS.has(parentCall.callee.property?.name)
                ) {
                    // This function is the first arg of .capture() — exempt
                    if (parentCall.arguments?.[0] === fn) return
                }

                // Defer reporting until Program:exit
                pendingViolations.push({ node, enclosingFn: fn, name: callee.name })
            },

            // Report deferred violations — only if enclosing fn has errorset creation
            "Program:exit"() {
                for (const { node, enclosingFn, name } of pendingViolations) {
                    if (errorsetFunctions.has(enclosingFn)) {
                        context.report({
                            node,
                            messageId: "noNewError",
                            data: { name },
                        })
                    }
                }
            },
        }
    },
}

