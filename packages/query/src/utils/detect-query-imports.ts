const TANSTACK_QUERY_IMPORT = /^@tanstack\/.+-query$/;

export function createTanstackQueryImportTracker() {
  const localToSource = new Map<string, string>();

  return {
    reset() {
      localToSource.clear();
    },

    handleImportDeclaration(node: any) {
      if (node?.type !== "ImportDeclaration") {
        return;
      }

      const source = node.source?.value;
      if (typeof source !== "string" || !TANSTACK_QUERY_IMPORT.test(source)) {
        return;
      }

      for (const specifier of node.specifiers ?? []) {
        if (specifier?.type === "ImportSpecifier" && specifier.local?.name) {
          localToSource.set(specifier.local.name, source);
        }
      }
    },

    isTanstackQueryImportByName(name: string): boolean {
      return localToSource.has(name);
    },

    isSpecificTanstackQueryImportByName(name: string, source: string): boolean {
      return localToSource.get(name) === source;
    },
  };
}
