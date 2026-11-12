import type { ESTree } from "@oxlint/plugins";

const TANSTACK_ROUTER_IMPORT = /^@tanstack\/.+-router$/;

export function createTanstackRouterImportTracker() {
  const imports = new Set<string>();

  return {
    reset() {
      imports.clear();
    },

    handleImportDeclaration(node: ESTree.ImportDeclaration) {
      const source = node.source.value;
      if (typeof source !== "string" || !TANSTACK_ROUTER_IMPORT.test(source)) {
        return;
      }

      for (const specifier of node.specifiers) {
        if (specifier.type === "ImportSpecifier" && specifier.local.name) {
          imports.add(specifier.local.name);
        }
      }
    },

    isTanstackRouterImport(name: string): boolean {
      return imports.has(name);
    },
  };
}
