/**
 * Tracks imports from `@takinprofit/errorset` and errorset guard identifiers
 * declared at module scope. Used by all plugin-errorset rules.
 */

const ERRORSET_SOURCE = "@takinprofit/errorset"

export type ErrorsetImportTracker = {
    reset(): void
    handleImportDeclaration(node: any): void
    handleVariableDeclaration(node: any): void
    /** True once the file has at least one import from @takinprofit/errorset */
    hasErrorsetImport(): boolean
    /** True if the given identifier name is a local errorset factory import (e.g. "errorSet") */
    isErrorsetFactory(name: string): boolean
    /** True if the given identifier name is a known errorset guard (e.g. "UserError") */
    isErrorsetGuard(name: string): boolean
    /** True if "isErr" is imported from errorset (local name may differ) */
    isIsErrImport(name: string): boolean
    /** All known guard names in the current file */
    guardNames(): Set<string>
}

export function createErrorsetImportTracker(): ErrorsetImportTracker {
    let importedFromErrorset = false
    // Maps local name → original export name
    const importedNames = new Map<string, string>()
    // Local variable names that hold errorset guards (const X = errorSet(...).init<T>())
    const guardNames_ = new Set<string>()

    return {
        reset() {
            importedFromErrorset = false
            importedNames.clear()
            guardNames_.clear()
        },

        handleImportDeclaration(node: any) {
            if (node?.source?.value !== ERRORSET_SOURCE) return
            importedFromErrorset = true

            for (const specifier of node.specifiers ?? []) {
                if (specifier?.type !== "ImportSpecifier") continue
                const localName: string = specifier.local?.name
                const importedName: string =
                    specifier.imported?.type === "Identifier"
                        ? specifier.imported.name
                        : specifier.imported?.value ?? localName
                if (localName) importedNames.set(localName, importedName)
            }
        },

        handleVariableDeclaration(node: any) {
            // Detect: const UserError = errorSet("...", [...]).init<T>()
            // The init() call is typed-erased, so at runtime the AST is just a CallExpression.
            // Pattern: VariableDeclarator where init is CallExpression
            //   callee: MemberExpression { object: CallExpression { callee: Identifier "errorSet" }, property: "init" }
            if (node?.type !== "VariableDeclaration" || node.kind !== "const") return

            for (const decl of node.declarations ?? []) {
                if (decl?.type !== "VariableDeclarator") continue
                if (decl.id?.type !== "Identifier") continue
                const init = decl.init
                if (!init) continue

                if (isErrorsetInitChain(init, importedNames)) {
                    guardNames_.add(decl.id.name)
                }
            }
        },

        hasErrorsetImport() {
            return importedFromErrorset
        },

        isErrorsetFactory(name: string) {
            return importedNames.get(name) === "errorSet"
        },

        isIsErrImport(name: string) {
            return importedNames.get(name) === "isErr"
        },

        isErrorsetGuard(name: string) {
            return guardNames_.has(name)
        },

        guardNames() {
            return guardNames_
        },
    }
}

/**
 * Returns true when the AST node represents the chain:
 *   errorSet("Name", [...]).init<T>()
 * or:
 *   errorSet("Name", [...]).init()
 */
function isErrorsetInitChain(node: any, importedNames: Map<string, string>): boolean {
    // Must be a CallExpression (the .init<T>() call)
    if (node?.type !== "CallExpression") return false
    const callee = node.callee
    // callee must be MemberExpression with property "init"
    if (
        callee?.type !== "MemberExpression" ||
        callee.property?.type !== "Identifier" ||
        callee.property.name !== "init"
    ) {
        return false
    }
    // object of MemberExpression must be the errorSet("...", [...]) call
    const obj = callee.object
    if (obj?.type !== "CallExpression") return false
    const innerCallee = obj.callee
    // innerCallee must be an Identifier whose local name maps to "errorSet"
    if (innerCallee?.type !== "Identifier") return false
    return importedNames.get(innerCallee.name) === "errorSet"
}
