import type { ESTree } from "@oxlint/plugins";

/**
 * Solid's modules on either major version: `solid-js` and its 1.x subpaths, plus 2.0's
 * `@solidjs/web`. Rules that branch on `settings.solidjs.version` pass it at version 2 (TASK-043);
 * the default below is the 1.x matcher, unchanged.
 */
export const SOLID_ANY_MODULE = /^(?:solid-js(?:\/.*)?|@solidjs\/web)$/;

export function trackImports(fromModule: RegExp = /^solid-js(?:\/?|\b)/) {
  const importMap = new Map<string, string>();

  return {
    handleImportDeclaration(node: ESTree.ImportDeclaration) {
      if (typeof node.source.value !== "string") {
        return;
      }

      if (!fromModule.test(node.source.value)) {
        return;
      }

      for (const specifier of node.specifiers ?? []) {
        if (
          specifier?.type === "ImportSpecifier" &&
          specifier.imported?.type === "Identifier" &&
          specifier.local?.type === "Identifier"
        ) {
          importMap.set(specifier.imported.name, specifier.local.name);
        }
      }
    },

    matchImport(imports: string | Array<string>, localName: string): string | undefined {
      const candidates = Array.isArray(imports) ? imports : [imports];
      return candidates.find((importName) => importMap.get(importName) === localName);
    },

    clear() {
      importMap.clear();
    },
  };
}
