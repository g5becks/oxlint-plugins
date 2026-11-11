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
  /** All known guard names in the current file (error sets and merged guards) */
  guardNames(): Set<string>;
  /** Guards built with `merge(A, B)` / `A.merge(B)`: set-level only, no kind guards */
  mergedGuardNames(): Set<string>;
  /** True if the identifier is an import of the given errorset export (e.g. "toError", "captureSync") */
  isErrorsetExport(localName: string, exportName: string): boolean;
  /** Local guard name for an error set name used in `err.set === "Name"` checks, if known */
  guardForSetName(setName: string): string | null;
};

/** Errorset exports a configured re-export module may provide (besides guards). */
const ERRORSET_EXPORTS = new Set([
  "errorSet",
  "isErr",
  "merge",
  "toError",
  "captureSync",
  "captureAsync",
  "recover",
  "inspect",
]);

export function createErrorsetImportTracker(): ErrorsetImportTracker {
  let importedFromErrorset = false;
  // Maps local name → original export name
  const importedNames = new Map<string, string>();
  // Local variable names that hold errorset guards (const X = errorSet(...).init<T>())
  const guardNames_ = new Set<string>();
  const mergedGuards = new Set<string>();
  // Error set name ("UserError" in errorSet("UserError", ...)) -> local guard name
  const guardBySetName = new Map<string, string>();
  let settings: ErrorsetSettings = parseErrorsetSettings(undefined);

  return {
    reset(next?: ErrorsetSettings) {
      importedFromErrorset = false;
      importedNames.clear();
      guardNames_.clear();
      mergedGuards.clear();
      guardBySetName.clear();
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
        if (ERRORSET_EXPORTS.has(importedName)) {
          importedNames.set(localName, importedName);
          importedFromErrorset = true;
        } else if (settings.guardPattern.test(importedName)) {
          guardNames_.add(localName);
          // Convention: an exported set's name is its export name.
          if (!guardBySetName.has(importedName)) guardBySetName.set(importedName, localName);
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

        const setName = errorsetInitChainName(init, importedNames);
        if (setName !== null) {
          guardNames_.add(decl.id.name);
          if (setName && !guardBySetName.has(setName)) guardBySetName.set(setName, decl.id.name);
        } else if (isMergeCall(init, importedNames, guardNames_)) {
          // const S = merge(A, B) or const S = A.merge(B): a set-level guard
          guardNames_.add(decl.id.name);
          mergedGuards.add(decl.id.name);
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

    mergedGuardNames() {
      return mergedGuards;
    },

    isErrorsetExport(localName: string, exportName: string) {
      return importedNames.get(localName) === exportName;
    },

    guardForSetName(setName: string) {
      return guardBySetName.get(setName) ?? null;
    },
  };
}

/**
 * For `errorSet("Name", kinds).init<T>(...)` (array- or object-form kinds) returns the set
 * name ("" when the first argument isn't a string literal); null for anything else.
 */
function errorsetInitChainName(node: any, importedNames: Map<string, string>): string | null {
  if (node?.type !== "CallExpression") return null;
  const callee = node.callee;
  if (
    callee?.type !== "MemberExpression" ||
    callee.property?.type !== "Identifier" ||
    callee.property.name !== "init"
  ) {
    return null;
  }
  const obj = callee.object;
  if (obj?.type !== "CallExpression") return null;
  const innerCallee = obj.callee;
  if (innerCallee?.type !== "Identifier" || importedNames.get(innerCallee.name) !== "errorSet") return null;
  const first = obj.arguments?.[0];
  return first?.type === "Literal" && typeof first.value === "string" ? first.value : "";
}

/** `merge(A, B, ...)` (imported merge) or `A.merge(B, ...)` where A is a known guard. */
function isMergeCall(node: any, importedNames: Map<string, string>, guardNames: Set<string>): boolean {
  if (node?.type !== "CallExpression") return false;
  const callee = node.callee;
  if (callee?.type === "Identifier") return importedNames.get(callee.name) === "merge";
  return (
    callee?.type === "MemberExpression" &&
    callee.property?.type === "Identifier" &&
    callee.property.name === "merge" &&
    callee.object?.type === "Identifier" &&
    guardNames.has(callee.object.name)
  );
}
