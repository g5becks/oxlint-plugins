/**
 * Tracks imports from `@takinprofit/errorset` (and the re-export modules configured in
 * `settings.errorset.modules`) and errorset guard identifiers. Used by all errorset rules.
 */
import { ERRORSET_SOURCE, type ErrorsetSettings, parseErrorsetSettings } from "./settings.ts";

export type ErrorsetImportTracker = {
  /** Forget the previous file; optionally apply the file's `settings.errorset`. */
  reset(settings?: ErrorsetSettings): void;
  handleImportDeclaration(node: any): void;
  handleVariableDeclaration(node: any): void;
  /** True once the file imports from @takinprofit/errorset, or a guard / errorset export from a configured module */
  hasErrorsetImport(): boolean;
  /** True if the given identifier name is a local errorset factory import (e.g. "errorSet") */
  isErrorsetFactory(name: string): boolean;
  /** True if the given identifier name is a known errorset guard (e.g. "UserError") */
  isErrorsetGuard(name: string): boolean;
  /** True if "isErr" is imported from errorset (local name may differ) */
  isIsErrImport(name: string): boolean;
  /** All known guard names in the current file */
  guardNames(): Set<string>;
};

export function createErrorsetImportTracker(): ErrorsetImportTracker {
  let importedFromErrorset = false;
  // Maps local name → original export name
  const importedNames = new Map<string, string>();
  // Local variable names that hold errorset guards (const X = errorSet(...).init<T>())
  const guardNames_ = new Set<string>();
  let settings: ErrorsetSettings = parseErrorsetSettings(undefined);

  return {
    reset(next?: ErrorsetSettings) {
      importedFromErrorset = false;
      importedNames.clear();
      guardNames_.clear();
      if (next) settings = next;
    },

    handleImportDeclaration(node: any) {
      const source = node?.source?.value;
      if (typeof source !== "string" || !settings.modules.has(source)) return;
      // `import type { UserError } from "..."` provides no runtime guard.
      if (node.importKind === "type") return;
      const isLibrary = source === ERRORSET_SOURCE;
      if (isLibrary) importedFromErrorset = true;

      for (const specifier of node.specifiers ?? []) {
        // Default and namespace imports (`import * as core`) are not tracked: rules match
        // guards by identifier, so `core.UserError` is not recognized (documented in the README).
        if (specifier?.type !== "ImportSpecifier") continue;
        if (specifier.importKind === "type") continue;
        const localName: string = specifier.local?.name;
        const importedName: string =
          specifier.imported?.type === "Identifier"
            ? specifier.imported.name
            : (specifier.imported?.value ?? localName);
        if (!localName) continue;
        if (isLibrary) {
          importedNames.set(localName, importedName);
          continue;
        }
        // Configured re-export module: errorset exports and guard-named sets.
        if (importedName === "errorSet" || importedName === "isErr") {
          importedNames.set(localName, importedName);
          importedFromErrorset = true;
        } else if (settings.guardPattern.test(importedName)) {
          guardNames_.add(localName);
          importedFromErrorset = true;
        }
      }
    },

    handleVariableDeclaration(node: any) {
      // Detect: const UserError = errorSet("...", [...]).init<T>()
      // The init() call is typed-erased, so at runtime the AST is just a CallExpression.
      // Pattern: VariableDeclarator where init is CallExpression
      //   callee: MemberExpression { object: CallExpression { callee: Identifier "errorSet" }, property: "init" }
      if (node?.type !== "VariableDeclaration" || node.kind !== "const") return;

      for (const decl of node.declarations ?? []) {
        if (decl?.type !== "VariableDeclarator") continue;
        if (decl.id?.type !== "Identifier") continue;
        const init = decl.init;
        if (!init) continue;

        if (isErrorsetInitChain(init, importedNames)) {
          guardNames_.add(decl.id.name);
        }
      }
    },

    hasErrorsetImport() {
      return importedFromErrorset;
    },

    isErrorsetFactory(name: string) {
      return importedNames.get(name) === "errorSet";
    },

    isIsErrImport(name: string) {
      return importedNames.get(name) === "isErr";
    },

    isErrorsetGuard(name: string) {
      return guardNames_.has(name);
    },

    guardNames() {
      return guardNames_;
    },
  };
}

/**
 * Returns true when the AST node represents the chain:
 *   errorSet("Name", [...]).init<T>()
 * or:
 *   errorSet("Name", [...]).init()
 */
function isErrorsetInitChain(node: any, importedNames: Map<string, string>): boolean {
  // Must be a CallExpression (the .init<T>() call)
  if (node?.type !== "CallExpression") return false;
  const callee = node.callee;
  // callee must be MemberExpression with property "init"
  if (
    callee?.type !== "MemberExpression" ||
    callee.property?.type !== "Identifier" ||
    callee.property.name !== "init"
  ) {
    return false;
  }
  // object of MemberExpression must be the errorSet("...", [...]) call
  const obj = callee.object;
  if (obj?.type !== "CallExpression") return false;
  const innerCallee = obj.callee;
  // innerCallee must be an Identifier whose local name maps to "errorSet"
  if (innerCallee?.type !== "Identifier") return false;
  return importedNames.get(innerCallee.name) === "errorSet";
}
